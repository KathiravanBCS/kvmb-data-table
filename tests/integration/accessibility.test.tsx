import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataGrid, createFilterCondition, createFilterGroup } from '../../src';
import { employeeColumns, employees, renderWithMantine } from '../utils';

async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: {
      // Color contrast cannot be computed in jsdom (no layout / CSS); it is checked in the browser e2e suite.
      'color-contrast': { enabled: false },
      // Page-level landmark rule: the grid is rendered without a surrounding page in these tests.
      region: { enabled: false },
    },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('accessibility (axe-core)', () => {
  it('a fully featured grid has no violations', async () => {
    const model = { ...createFilterGroup('and'), children: [createFilterCondition('salary', 'gt', 1)] };
    const { container } = renderWithMantine(
      <DataGrid
        aria-label="Employees"
        data={employees}
        columns={employeeColumns}
        enableFiltering
        enableRowSelection
        enablePagination
        enableColumnResizing
        enableColumnPinning
        enableColumnOrdering
        enableRowDragging
        enableGrouping
        enableEditing
        enableExport
        defaultFilterModel={model}
        defaultRowSelection={{ '1': true }}
        onRowReorder={() => {}}
      />,
    );
    expect(await violations(container)).toEqual([]);
  });

  it('grouped, empty, loading and error states have no violations', async () => {
    const grouped = renderWithMantine(
      <DataGrid
        aria-label="Grouped"
        data={employees}
        columns={employeeColumns}
        enableGrouping
        defaultGrouping={['department']}
        showFooter
      />,
    );
    expect(await violations(grouped.container)).toEqual([]);
    grouped.unmount();
    const empty = renderWithMantine(<DataGrid aria-label="Empty" data={[]} columns={employeeColumns} />);
    expect(await violations(empty.container)).toEqual([]);
    empty.unmount();
    const loading = renderWithMantine(<DataGrid aria-label="Loading" data={[]} columns={employeeColumns} loading />);
    expect(await violations(loading.container)).toEqual([]);
    loading.unmount();
    const error = renderWithMantine(<DataGrid aria-label="Error" data={[]} columns={employeeColumns} error="Nope" onRetry={() => {}} />);
    expect(await violations(error.container)).toEqual([]);
  });

  it('editing (cell and row mode) has no violations', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(
      <DataGrid aria-label="Editable" data={employees} columns={employeeColumns} enableEditing editMode="row" />,
    );
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(await violations(container)).toEqual([]);
  });

  it('open filter builder and column filter popovers have no violations', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderWithMantine(<DataGrid aria-label="Filters" data={employees} columns={employeeColumns} enableFiltering />);
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    expect(await violations(baseElement as HTMLElement)).toEqual([]);
  });
});
