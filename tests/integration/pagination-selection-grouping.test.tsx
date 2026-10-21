import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid, aggregationFns, type DataGridApi } from '../../src';
import { columnTexts, employeeColumns, employees, makeRows, renderWithMantine, type Employee } from '../utils';

describe('pagination', () => {
  it('paginates client-side with page navigation and page size', async () => {
    const user = userEvent.setup();
    const rows = makeRows(23);
    const onChange = vi.fn();
    const { container } = renderWithMantine(
      <DataGrid data={rows} columns={employeeColumns} enablePagination pageSizeOptions={[5, 10]} onPaginationChange={onChange} />,
    );
    expect(columnTexts(container, 'name')).toHaveLength(5);
    expect(screen.getByText('1–5 of 23')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(columnTexts(container, 'name')[0]).toBe('Person 6');
    expect(onChange).toHaveBeenLastCalledWith({ pageIndex: 1, pageSize: 5 });
    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(columnTexts(container, 'name')).toEqual(['Person 21', 'Person 22', 'Person 23']);
    expect(screen.getByText('21–23 of 23')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'First page' }));
    expect(columnTexts(container, 'name')[0]).toBe('Person 1');
    // aria-rowindex continues across pages
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(container.querySelector('.mdg-tbody [role="row"]')).toHaveAttribute('aria-rowindex', '7');
  });

  it('uses rowCount and does not slice rows for server pagination', () => {
    const { container } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} enablePagination manualPagination rowCount={95} pagination={{ pageIndex: 3, pageSize: 25 }} />,
    );
    expect(columnTexts(container, 'name')).toHaveLength(5);
    expect(screen.getByText('76–95 of 95')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 4' })).toHaveAttribute('aria-current', 'page');
  });

  it('clamps the page when data shrinks', async () => {
    const { container, rerender } = renderWithMantine(
      <DataGrid data={makeRows(20)} columns={employeeColumns} enablePagination defaultPagination={{ pageIndex: 3, pageSize: 5 }} />,
    );
    expect(columnTexts(container, 'name')[0]).toBe('Person 16');
    rerender(<DataGrid data={makeRows(7)} columns={employeeColumns} enablePagination defaultPagination={{ pageIndex: 3, pageSize: 5 }} />);
    await waitFor(() => expect(columnTexts(container, 'name')).toEqual(['Person 6', 'Person 7']));
  });
});

describe('row selection', () => {
  it('selects rows with checkboxes and reports selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableRowSelection onRowSelectionChange={onChange} />);
    const boxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    await user.click(boxes[1]);
    expect(onChange).toHaveBeenLastCalledWith({ '2': true });
    expect(screen.getAllByRole('row')[2]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(onChange).toHaveBeenLastCalledWith({ '1': true, '2': true, '3': true, '4': true, '5': true });
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onChange).toHaveBeenLastCalledWith({});
    expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('single selection mode uses radios and replaces the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableRowSelection selectionMode="single" onRowSelectionChange={onChange} />);
    const radios = screen.getAllByRole('radio', { name: 'Select row' });
    await user.click(radios[0]);
    await user.click(radios[2]);
    expect(onChange).toHaveBeenLastCalledWith({ '3': true });
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-multiselectable');
  });

  it('respects per-row selectability and row click selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} enableRowSelection={(row) => row.original.active} selectOnRowClick onRowSelectionChange={onChange} />,
    );
    const boxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    expect(boxes[1]).toBeDisabled();
    await user.click(screen.getByText('Carol'));
    expect(onChange).toHaveBeenLastCalledWith({ '3': true });
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(onChange).toHaveBeenLastCalledWith({ '1': true, '3': true, '4': true });
  });

  it('offers "select all filtered rows" across pages and renders bulk actions', async () => {
    const user = userEvent.setup();
    const bulk = vi.fn();
    renderWithMantine(
      <DataGrid
        data={makeRows(12)}
        columns={employeeColumns}
        enableRowSelection
        enablePagination
        defaultPagination={{ pageSize: 5 }}
        renderBulkActions={({ selectedRows }) => <button onClick={() => bulk(selectedRows.map((r) => r.id))}>Archive</button>}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(screen.getByRole('button', { name: 'Select all 12 rows' }));
    expect(screen.getByText('12 selected')).toBeInTheDocument();
    expect(screen.getByText('All 12 rows are selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(bulk.mock.calls[0][0]).toHaveLength(12);
  });

  it('keeps selection by stable row id across data refreshes (controlled)', () => {
    const { rerender } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableRowSelection rowSelection={{ '3': true }} />);
    rerender(<DataGrid data={[...employees].reverse()} columns={employeeColumns} enableRowSelection rowSelection={{ '3': true }} />);
    const selected = screen.getAllByRole('row').filter((r) => r.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Carol');
  });
});

describe('grouping & aggregation', () => {
  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'name', header: 'Name', aggregationFn: 'count', aggregatedCell: ({ getValue }) => `${getValue()} people` },
    { accessorKey: 'salary', header: 'Salary', aggregationFn: aggregationFns.avg, aggregatedCell: ({ getValue }) => `avg ${Math.round(getValue() as number)}` },
    { accessorKey: 'active', header: 'Active' },
  ];

  it('groups rows with counts, aggregates and expand/collapse', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableGrouping defaultGrouping={['department']} />);
    const groupRows = container.querySelectorAll('.mdg-group-row');
    expect(groupRows).toHaveLength(3);
    expect(groupRows[0]).toHaveTextContent('Engineering(2)');
    expect(groupRows[0]).toHaveTextContent('2 people');
    expect(groupRows[0]).toHaveTextContent('avg 127500');
    expect(groupRows[0]).toHaveAttribute('aria-expanded', 'false');
    await user.click(within(groupRows[0] as HTMLElement).getByRole('button', { name: 'Expand group' }));
    expect(columnTexts(container, 'name')).toContain('Alice');
    await user.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(container.querySelectorAll('.mdg-tbody .mdg-tr:not(.mdg-group-row)')).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(container.querySelectorAll('.mdg-tbody .mdg-tr:not(.mdg-group-row)')).toHaveLength(0);
  });

  it('groups by multiple columns (nested) and via the column menu', async () => {
    const user = userEvent.setup();
    const onGrouping = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableGrouping onGroupingChange={onGrouping} />);
    await user.click(screen.getByRole('button', { name: 'Column actions: Department' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Group by this column' }));
    expect(onGrouping).toHaveBeenLastCalledWith(['department']);
    await user.click(screen.getByRole('button', { name: 'Column actions: Active' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Group by this column' }));
    expect(onGrouping).toHaveBeenLastCalledWith(['department', 'active']);
    await user.click(screen.getByRole('button', { name: 'Expand all' }));
    const nested = container.querySelectorAll('.mdg-group-row[aria-level="2"]');
    expect(nested.length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Remove grouping: Department' }));
    expect(onGrouping).toHaveBeenLastCalledWith(['active']);
  });

  it('renders custom group headers', () => {
    renderWithMantine(
      <DataGrid
        data={employees}
        columns={columns}
        enableGrouping
        defaultGrouping={['department']}
        renderGroupHeader={({ value, count }) => <span data-testid="gh">{`${String(value)} – ${count}`}</span>}
      />,
    );
    expect(screen.getAllByTestId('gh').map((n) => n.textContent)).toEqual(['Engineering – 2', 'Sales – 2', 'Marketing – 1']);
  });

  it('exposes the API for selection and grouping-aware export', () => {
    const api = createRef<DataGridApi<Employee>>();
    renderWithMantine(<DataGrid data={employees} columns={columns} enableGrouping enableRowSelection defaultGrouping={['department']} apiRef={api} />);
    expect(api.current!.exportCsv({ download: false }).rowCount).toBe(5);
    api.current!.selectAllFiltered();
  });
});
