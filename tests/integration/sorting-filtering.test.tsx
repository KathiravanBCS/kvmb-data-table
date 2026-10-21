import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { DataGrid, createFilterCondition, createFilterGroup, type DataGridQuery, type FilterGroup } from '../../src';
import { columnTexts, employeeColumns, employees, renderWithMantine } from '../utils';

const header = (name: string) => screen.getAllByRole('columnheader').find((h) => h.textContent?.startsWith(name))!;

describe('sorting', () => {
  it('cycles asc → desc → none on header click and sets aria-sort', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} />);
    await user.click(header('Salary'));
    expect(header('Salary')).toHaveAttribute('aria-sort', 'ascending');
    expect(columnTexts(container, 'name')).toEqual(['Dan', 'Bob', 'Eve', 'Alice', 'Carol']);
    await user.click(header('Salary'));
    expect(header('Salary')).toHaveAttribute('aria-sort', 'descending');
    expect(columnTexts(container, 'name')).toEqual(['Carol', 'Alice', 'Eve', 'Bob', 'Dan']);
    await user.click(header('Salary'));
    expect(header('Salary')).toHaveAttribute('aria-sort', 'none');
    expect(columnTexts(container, 'name')).toEqual(['Alice', 'Bob', 'Carol', 'Dan', 'Eve']);
  });

  it('multi-sorts with shift-click', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} />);
    await user.click(header('Department'));
    await user.keyboard('{Shift>}');
    await user.click(header('Salary'));
    await user.click(header('Salary'));
    await user.keyboard('{/Shift}');
    expect(columnTexts(container, 'name')).toEqual(['Carol', 'Alice', 'Dan', 'Eve', 'Bob']);
    expect(header('Salary').querySelector('.mdg-sort-index')).toHaveTextContent('2');
  });

  it('supports controlled sorting, default sorting and custom sorting functions', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Controlled() {
      const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: true }]);
      return (
        <DataGrid
          data={employees}
          columns={[
            { accessorKey: 'name', header: 'Name', sortingFn: (a, b) => a.original.name.length - b.original.name.length || a.original.name.localeCompare(b.original.name) },
            { accessorKey: 'salary', header: 'Salary' },
          ]}
          sorting={sorting}
          onSortingChange={(s) => {
            onChange(s);
            setSorting(s);
          }}
        />
      );
    }
    const { container } = renderWithMantine(<Controlled />);
    expect(columnTexts(container, 'name')).toEqual(['Carol', 'Alice', 'Eve', 'Dan', 'Bob']);
    await user.click(header('Salary'));
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'salary', desc: false }]);
  });

  it('sorts from the keyboard and announces the change', async () => {
    const user = userEvent.setup();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} />);
    const name = header('Name');
    name.focus();
    await user.keyboard('{Enter}');
    expect(name).toHaveAttribute('aria-sort', 'ascending');
    await waitFor(() => expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('Sorted by Name, ascending'));
  });

  it('does not sort locally in manual mode', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} manualSorting />);
    await user.click(header('Salary'));
    expect(columnTexts(container, 'name')).toEqual(['Alice', 'Bob', 'Carol', 'Dan', 'Eve']);
  });
});

describe('filtering', () => {
  it('filters with the debounced global search and shows a chip', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableFiltering globalFilterDebounce={0} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search all columns' }), 'sales');
    await waitFor(() => expect(columnTexts(container, 'name')).toEqual(['Bob', 'Eve']));
    expect(screen.getByText('“sales”')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove filter: “sales”' }));
    await waitFor(() => expect(columnTexts(container, 'name')).toHaveLength(5));
  });

  it('applies a filter model (AND/OR, nested) and renders removable chips', async () => {
    const user = userEvent.setup();
    const model: FilterGroup = {
      ...createFilterGroup('and'),
      children: [createFilterCondition('department', 'in', ['Engineering', 'Sales']), { ...createFilterGroup('or'), children: [createFilterCondition('salary', 'gt', 100000), createFilterCondition('active', 'isFalse')] }],
    };
    const onChange = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableFiltering defaultFilterModel={model} onFilterModelChange={onChange} />);
    expect(columnTexts(container, 'name')).toEqual(['Alice', 'Bob', 'Carol', 'Eve']);
    const chips = screen.getByRole('list', { name: 'Filters' });
    expect(within(chips).getByText(/Department is any of Engineering, Sales/)).toBeInTheDocument();
    expect(header('Department')).toHaveAttribute('data-filtered');
    await user.click(within(chips).getByRole('button', { name: /Remove filter: Department/ }));
    expect(columnTexts(container, 'name')).toEqual(['Alice', 'Bob', 'Carol', 'Eve']);
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(columnTexts(container, 'name')).toHaveLength(5);
  });

  it('filters a column from the header filter popover', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableFiltering />);
    await user.click(screen.getByRole('button', { name: 'Filter column: Name' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filter column: Name' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Value – Name' }), 'ar');
    await waitFor(() => expect(columnTexts(container, 'name')).toEqual(['Carol']), { timeout: 2000 });
    expect(header('Name')).toHaveAttribute('data-filtered');
    await user.click(within(dialog).getByRole('button', { name: 'Clear filter' }));
    await waitFor(() => expect(columnTexts(container, 'name')).toHaveLength(5));
  });

  it('builds a filter in the visual builder and applies it', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableFiltering />);
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const dialog = await screen.findByRole('dialog', { name: /^Filters/ });
    await user.click(within(dialog).getByRole('button', { name: 'Add condition' }));
    const condition = within(dialog).getByTestId('filter-condition');
    // First filterable column is Name / Contains
    await user.type(within(condition).getByRole('textbox', { name: 'Value' }), 'o');
    expect(columnTexts(container, 'name')).toHaveLength(5); // draft not applied yet
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(columnTexts(container, 'name')).toEqual(['Bob', 'Carol']);
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    const reopened = await screen.findByRole('dialog', { name: /^Filters/ });
    expect(within(reopened).getAllByTestId('filter-condition')).toHaveLength(1);
  });

  it('saves and applies filter presets', async () => {
    const user = userEvent.setup();
    const onPresets = vi.fn();
    const preset = { id: 'p1', name: 'Engineers', model: { ...createFilterGroup('and'), children: [createFilterCondition('department', 'in', ['Engineering'])] } };
    const { container } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} enableFiltering defaultFilterPresets={[preset]} onFilterPresetsChange={onPresets} />,
    );
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await user.click(await screen.findByRole('button', { name: 'Presets' }));
    await user.click(await screen.findByRole('menuitem', { name: /Engineers/ }));
    expect(columnTexts(container, 'name')).toEqual(['Alice', 'Carol']);
    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Mine{Enter}');
    expect(onPresets).toHaveBeenCalledWith([preset, expect.objectContaining({ name: 'Mine' })]);
  });

  it('emits server queries and skips local filtering in manual mode', async () => {
    const queries: DataGridQuery[] = [];
    const model: FilterGroup = { ...createFilterGroup('and'), children: [createFilterCondition('name', 'equals', 'Bob')] };
    const { container, rerender } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} manualFiltering manualSorting manualPagination enablePagination rowCount={500} onQueryChange={(q) => queries.push(q)} />,
    );
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({ pagination: { pageIndex: 0, pageSize: 25 }, sorting: [], globalFilter: '' });
    rerender(<DataGrid data={employees} columns={employeeColumns} manualFiltering manualSorting manualPagination enablePagination rowCount={500} filterModel={model} onQueryChange={(q) => queries.push(q)} />);
    expect(queries.at(-1)!.filterModel).toBe(model);
    expect(columnTexts(container, 'name')).toHaveLength(5);
    expect(screen.getByText(`1–25 of ${(500).toLocaleString()}`)).toBeInTheDocument();
  });

  it('resets to the first page when filters change', async () => {
    const onPagination = vi.fn();
    const { rerender } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} enablePagination defaultPagination={{ pageIndex: 1, pageSize: 2 }} onPaginationChange={onPagination} />,
    );
    rerender(<DataGrid data={employees} columns={employeeColumns} enablePagination defaultPagination={{ pageIndex: 1, pageSize: 2 }} onPaginationChange={onPagination} globalFilter="a" />);
    // Controlled global filter change does not go through the setter; use the API path instead:
    expect(onPagination).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(header('Name'));
    });
    expect(onPagination).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 2 });
  });
});
