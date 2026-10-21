import { useRef, useState } from 'react';
import { Button, Group, Progress, Stack } from '@mantine/core';
import { DataGrid, type DataGridApi } from '@kvmb/react-data-grid';
import { exportToExcel } from '@kvmb/react-data-grid/export';
import { employeeColumns } from '../columns';
import { generateEmployees, type Employee } from '../data';

const data = generateEmployees(300);

export default function ExportDemo() {
  const api = useRef<DataGridApi<Employee>>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const excel = async () => {
    // ExcelJS is loaded on demand the first time this runs.
    await exportToExcel(api.current!.table, {
      filename: 'employees.xlsx',
      headerStyle: { fillColor: '#228BE6', fontColor: '#FFFFFF' },
      autoFilter: true,
      onProgress: ({ progress: p }) => setProgress(p),
      sheets: [
        { name: 'Filtered', rows: 'filtered' },
        { name: 'Selected', rows: 'selected' },
        {
          name: 'Summary',
          columns: [{ key: 'metric', header: 'Metric', width: 24 }, { key: 'value', header: 'Value', width: 16 }],
          data: [
            { metric: 'Exported at', value: new Date().toISOString() },
            { metric: 'Rows (filtered)', value: api.current!.table.getFilteredRowModel().rows.length },
          ],
        },
      ],
    });
    setTimeout(() => setProgress(null), 600);
  };

  return (
    <Stack>
      <Group>
        <Button size="xs" onClick={() => api.current!.exportCsv({ filename: 'employees.csv' })}>
          CSV (filtered, visible columns)
        </Button>
        <Button size="xs" variant="light" onClick={() => api.current!.exportCsv({ rows: 'selected', columns: 'all', filename: 'selected.csv' })}>
          CSV (selected, all columns)
        </Button>
        <Button size="xs" variant="light" onClick={excel}>
          Excel (3 sheets)
        </Button>
        {progress !== null && <Progress value={progress * 100} w={120} aria-label="Export progress" />}
      </Group>
      <DataGrid apiRef={api} data={data} columns={employeeColumns} enableRowSelection enableFiltering enableExport height={380} aria-label="Exportable employees" />
    </Stack>
  );
}
