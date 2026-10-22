import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type TableState,
} from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { exportToCsv, escapeCsvCell, toCsv } from '../../src/export/csv';
import { exportToExcel, sanitizeSheetName } from '../../src/export';
import { employees, type Employee } from '../utils';
import '../../src/core/column-meta';

const columns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'salary', header: 'Salary', meta: { excelNumberFormat: '#,##0' } },
  { accessorKey: 'startDate', header: 'Start', meta: { filterVariant: 'date' } },
  { id: 'city', accessorFn: (r) => r.address?.city, header: 'City', meta: { exportHeader: 'Home city' } },
  { accessorKey: 'department', header: 'Dept', meta: { exportable: false } },
  { id: 'actions', header: 'Actions', cell: () => null },
];

function useTable(state: Partial<TableState> = {}) {
  return useReactTable({
    data: employees,
    columns,
    getRowId: (r) => r.id,
    state: { sorting: [], rowSelection: {}, columnVisibility: {}, globalFilter: '', pagination: { pageIndex: 0, pageSize: 2 }, ...state },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onStateChange: () => {},
  });
}

/** jsdom's Blob lacks arrayBuffer(); FileReader works. */
function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('CSV', () => {
  it('escapes delimiters, quotes and newlines (RFC 4180)', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a;b', ';')).toBe('"a;b"');
  });

  it('neutralises formula injection but keeps negative numbers', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell('-42.5')).toBe('-42.5');
    expect(escapeCsvCell('=1', ',', false)).toBe('=1');
  });

  it('formats values', () => {
    expect(toCsv([[null, undefined, true, 3, ['x', 'y'], new Date(Date.UTC(2024, 0, 2))]])).toBe(
      ',,true,3,"x, y",2024-01-02T00:00:00.000Z',
    );
  });

  it('exports filtered/sorted rows with visible, exportable columns', () => {
    const { result } = renderHook(() => useTable({ sorting: [{ id: 'salary', desc: true }], globalFilter: 'Engineering' }));
    const { csv, rowCount, filename } = exportToCsv(result.current, { download: false, filename: 'people' });
    const lines = csv.split('\r\n');
    expect(filename).toBe('people.csv');
    expect(lines[0]).toBe('Name,Salary,Start,Home city');
    // Engineering rows, sorted by salary descending
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(['Carol', 'Alice']);
    expect(rowCount).toBe(2);
  });

  it('exports selected rows, all rows and the current page', () => {
    const { result } = renderHook(() => useTable({ rowSelection: { '2': true, '4': true } }));
    expect(
      exportToCsv(result.current, { download: false, rows: 'selected' })
        .csv.split('\r\n')
        .slice(1)
        .map((l) => l.split(',')[0]),
    ).toEqual(['Bob', 'Dan']);
    expect(exportToCsv(result.current, { download: false, rows: 'all' }).rowCount).toBe(5);
    expect(exportToCsv(result.current, { download: false, rows: 'page' }).rowCount).toBe(2);
  });

  it('supports explicit columns, custom headers/values and no header row', () => {
    const { result } = renderHook(() => useTable());
    const { csv } = exportToCsv(result.current, {
      download: false,
      columns: ['name', 'salary'],
      includeHeaders: false,
      getValue: (row, column) => (column.id === 'salary' ? row.original.salary / 1000 : row.original.name.toUpperCase()),
    });
    expect(csv.split('\r\n')[0]).toBe('ALICE,120');
  });

  it('triggers a UTF-8 download with BOM', async () => {
    const created: Blob[] = [];
    const spy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob);
      return 'blob:x';
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() => useTable());
    exportToCsv(result.current, { filename: 'x' });
    expect(click).toHaveBeenCalledTimes(1);
    const bytes = new Uint8Array(await readBlob(created[0]));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    spy.mockRestore();
    click.mockRestore();
  });
});

describe('Excel', () => {
  it('sanitises and de-duplicates sheet names', () => {
    const used = new Set<string>();
    expect(sanitizeSheetName('Sales/Q1:2024', used)).toBe('Sales Q1 2024');
    expect(sanitizeSheetName('Sales/Q1:2024', used)).toBe('Sales Q1 2024 (2)');
    expect(sanitizeSheetName('x'.repeat(40), used)).toHaveLength(31);
  });

  it('builds a workbook with styled headers, formats and multiple sheets', async () => {
    const { result } = renderHook(() => useTable({ rowSelection: { '1': true } }));
    const progress: string[] = [];
    const { blob, rowCount, filename } = await exportToExcel(result.current, {
      download: false,
      filename: 'report',
      headerStyle: { fillColor: '#228BE6', fontColor: '#FFFFFF' },
      onProgress: (p) => progress.push(p.phase),
      sheets: [
        { name: 'All', rows: 'all' },
        { name: 'Selected', rows: 'selected' },
        {
          name: 'Summary',
          columns: [
            { key: 'k', header: 'Key' },
            { key: 'v', header: 'Value', numberFormat: '0.00' },
          ],
          data: [{ k: 'total', v: 5 }],
        },
      ],
    });
    expect(filename).toBe('report.xlsx');
    expect(rowCount).toBe(5 + 1 + 1);
    expect(progress[0]).toBe('loading');
    expect(progress.at(-1)).toBe('done');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readBlob(blob));
    expect(workbook.worksheets.map((w) => w.name)).toEqual(['All', 'Selected', 'Summary']);
    const all = workbook.getWorksheet('All')!;
    expect(all.getRow(1).values).toEqual([undefined, 'Name', 'Salary', 'Start', 'Home city']);
    expect(all.getCell('A2').value).toBe('Alice');
    expect(all.getCell('B2').value).toBe(120000);
    expect(all.getColumn(2).numFmt).toBe('#,##0');
    expect(all.getCell('C2').value).toBeInstanceOf(Date);
    expect(all.getColumn(3).numFmt).toBe('yyyy-mm-dd');
    expect(all.getCell('A1').font?.bold).toBe(true);
    expect(all.getRow(1).getCell(1).fill).toMatchObject({ fgColor: { argb: 'FF228BE6' } });
    expect(workbook.getWorksheet('Selected')!.rowCount).toBe(2);
  });
});
