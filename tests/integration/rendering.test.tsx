import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '../../src';
import { columnTexts, employeeColumns, employees, renderWithMantine, type Employee } from '../utils';

describe('DataGrid rendering', () => {
  it('renders headers and rows with ARIA grid semantics', () => {
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} aria-label="Employees" />);
    const grid = screen.getByRole('grid', { name: 'Employees' });
    expect(grid).toHaveAttribute('aria-rowcount', String(1 + employees.length));
    expect(grid).toHaveAttribute('aria-colcount', '5');
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Name', 'Department', 'Salary', 'Start date', 'Active']);
    expect(columnTexts(container, 'name')).toEqual(['Alice', 'Bob', 'Carol', 'Dan', 'Eve']);
    // Default formatting: numbers localised, booleans as Yes/No
    expect(columnTexts(container, 'salary')[0]).toBe((120000).toLocaleString());
    expect(columnTexts(container, 'active')).toEqual(['Yes', 'No', 'Yes', 'Yes', 'No']);
    const firstRow = within(grid).getAllByRole('row')[1];
    expect(firstRow).toHaveAttribute('aria-rowindex', '2');
  });

  it('supports nested accessors, custom cells, headers and formatters', () => {
    const columns: ColumnDef<Employee>[] = [
      { accessorKey: 'address.city', header: () => <em>City</em> },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <strong data-testid="custom">{String(getValue()).toUpperCase()}</strong>,
      },
      { accessorKey: 'salary', header: 'Salary', meta: { format: (v) => `$${(v as number) / 1000}k` } },
    ];
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} />);
    expect(screen.getAllByRole('columnheader')[0].querySelector('em')).toHaveTextContent('City');
    expect(columnTexts(container, 'address_city')[0]).toBe('Berlin');
    expect(screen.getAllByTestId('custom')[1]).toHaveTextContent('BOB');
    expect(columnTexts(container, 'salary')[0]).toBe('$120k');
  });

  it('applies conditional row and cell classes/styles', () => {
    const columns: ColumnDef<Employee>[] = [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'salary',
        header: 'Salary',
        meta: { cellClassName: (cell) => ((cell.getValue() as number) > 100000 ? 'high' : undefined), cellStyle: { color: 'red' } },
      },
    ];
    const { container } = renderWithMantine(
      <DataGrid
        data={employees}
        columns={columns}
        getRowClassName={(row) => (row.original.active ? 'is-active' : undefined)}
        getRowStyle={() => ({ fontStyle: 'italic' })}
      />,
    );
    expect(container.querySelectorAll('.is-active')).toHaveLength(3);
    expect(container.querySelectorAll('.high')).toHaveLength(2);
    expect(container.querySelector<HTMLElement>('[data-column-id="salary"][role="gridcell"]')!.style.color).toBe('red');
    expect(container.querySelector<HTMLElement>('.mdg-tbody .mdg-tr')!.style.fontStyle).toBe('italic');
  });

  it('shows the empty state, the filtered empty state and a custom empty renderer', () => {
    const { rerender } = renderWithMantine(<DataGrid data={[]} columns={employeeColumns} />);
    expect(screen.getByText('No rows to display')).toBeInTheDocument();
    rerender(<DataGrid data={employees} columns={employeeColumns} globalFilter="zzz" enableGlobalFilter />);
    expect(screen.getByText('No rows match the current filters')).toBeInTheDocument();
    rerender(<DataGrid data={[]} columns={employeeColumns} renderEmpty={({ filtered }) => <span>custom {String(filtered)}</span>} />);
    expect(screen.getByText('custom false')).toBeInTheDocument();
  });

  it('shows skeleton rows while loading without data and an overlay with data', () => {
    const { container, rerender } = renderWithMantine(<DataGrid data={[]} columns={employeeColumns} loading skeletonRows={3} />);
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(3);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
    rerender(<DataGrid data={employees} columns={employeeColumns} loading />);
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(0);
    expect(container.querySelector('.mantine-LoadingOverlay-root')).toBeInTheDocument();
  });

  it('shows the error state with retry', async () => {
    let retried = 0;
    renderWithMantine(<DataGrid data={[]} columns={employeeColumns} error={new Error('Boom')} onRetry={() => retried++} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load data');
    expect(screen.getByText('Boom')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(retried).toBe(1);
  });

  it('applies density, wrapping and layout data attributes', () => {
    const { container } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} density="compact" wrapText striped withColumnBorders layoutMode="fixed" />,
    );
    const root = container.querySelector('.mdg-root')!;
    expect(root).toHaveAttribute('data-density', 'compact');
    expect(root).toHaveAttribute('data-wrap');
    expect(root).toHaveAttribute('data-layout', 'fixed');
    expect((root as HTMLElement).style.getPropertyValue('--dg-row-height')).toBe('32px');
    expect(container.querySelectorAll('.mdg-tbody [data-striped]')).toHaveLength(2);
  });

  it('supports Mantine Styles API classNames / styles and static classes', () => {
    const { container } = renderWithMantine(
      <DataGrid
        data={employees}
        columns={employeeColumns}
        classNames={{ root: 'my-root', cell: 'my-cell' }}
        styles={{ headerCell: { letterSpacing: '1px' } }}
      />,
    );
    expect(container.querySelector('.my-root')).toHaveClass('mantine-DataGrid-root', 'mdg-root');
    expect(container.querySelectorAll('.my-cell').length).toBe(25);
    expect(container.querySelector<HTMLElement>('.mdg-th')!.style.letterSpacing).toBe('1px');
  });

  it('renders a footer with aggregations and custom footers', () => {
    const columns: ColumnDef<Employee>[] = [
      { accessorKey: 'name', header: 'Name', footer: () => 'Totals' },
      { accessorKey: 'salary', header: 'Salary', aggregationFn: 'sum', meta: { footerAggregation: true } },
      { accessorKey: 'department', header: 'Dept', aggregationFn: 'uniqueCount', meta: { footerAggregation: true } },
    ];
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} />);
    const footer = container.querySelector('.mdg-footer-row')!;
    expect(footer).toHaveTextContent('Totals');
    expect(footer).toHaveTextContent(`Sum: ${(500000).toLocaleString()}`);
    expect(footer).toHaveTextContent('Unique: 3');
  });

  it('renders column groups (multi-level headers)', () => {
    const columns: ColumnDef<Employee>[] = [
      { header: 'Person', columns: [{ accessorKey: 'name', header: 'Name' }] },
      {
        header: 'Job',
        columns: [
          { accessorKey: 'department', header: 'Dept' },
          { accessorKey: 'salary', header: 'Salary' },
        ],
      },
    ];
    renderWithMantine(<DataGrid data={employees} columns={columns} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Person', 'Job', 'Name', 'Dept', 'Salary']);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', String(2 + employees.length));
  });
});
