import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid, type DataGridApi } from '../../src';
import { columnTexts, employeeColumns, employees, renderWithMantine, type Employee } from '../utils';

interface Node {
  id: string;
  name: string;
  amount: number;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: 'a',
    name: 'Alpha',
    amount: 30,
    children: [
      { id: 'a1', name: 'Alpha one', amount: 10 },
      { id: 'a2', name: 'Alpha two', amount: 20, children: [{ id: 'a2x', name: 'Alpha two x', amount: 20 }] },
    ],
  },
  { id: 'b', name: 'Beta', amount: 6, children: [{ id: 'b1', name: 'Beta one', amount: 5 }] },
];

const treeColumns: ColumnDef<Node>[] = [
  { accessorKey: 'name', header: 'Name', footer: () => 'Totals' },
  { accessorKey: 'amount', header: 'Amount', aggregationFn: 'sum', meta: { footerAggregation: 'roots' } },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('master / detail', () => {
  it('adds an expand column and renders the detail panel below an expanded row', async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataGrid<Employee>
        data={employees}
        columns={employeeColumns}
        renderDetailPanel={({ row }) => <p>Details for {row.original.name}</p>}
        getRowCanExpand={(row) => row.original.id !== '2'}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: 'Expand row' });
    // Bob (id 2) cannot expand.
    expect(buttons).toHaveLength(4);
    expect(screen.queryByText('Details for Alice')).not.toBeInTheDocument();
    await user.click(buttons[0]);
    expect(screen.getByText('Details for Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse row' })).toHaveAttribute('aria-expanded', 'true');
    const detailCell = screen.getByText('Details for Alice').closest('[role="gridcell"]')!;
    expect(detailCell).toHaveAttribute('aria-colspan', String(employeeColumns.length + 1));
    // The panel row follows its master row.
    const wrap = detailCell.closest('.mdg-row-wrap')!;
    expect(wrap.querySelector('[data-row-id="1"]')).not.toBeNull();
  });

  it('toggles the panel with Enter on the expand cell', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(
      <DataGrid<Employee> data={employees} columns={employeeColumns} renderDetailPanel={({ row }) => <p>Panel {row.id}</p>} />,
    );
    const cell = container.querySelector<HTMLElement>('[data-row-index="1"][data-column-id="__dg_expand"]')!;
    act(() => cell.focus());
    await user.keyboard('{Enter}');
    expect(screen.getByText('Panel 2')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.queryByText('Panel 2')).not.toBeInTheDocument();
  });

  it('keeps keyboard navigation of a nested grid separate from the outer grid', async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataGrid<Employee>
        data={employees}
        columns={employeeColumns}
        defaultExpanded={{ '1': true }}
        renderDetailPanel={() => <DataGrid<Employee> data={employees.slice(0, 3)} columns={employeeColumns} aria-label="Inner" />}
        aria-label="Outer"
      />,
    );
    const inner = screen.getByRole('grid', { name: 'Inner' });
    const first = within(inner)
      .getAllByRole('gridcell')
      .find((c) => c.dataset.rowIndex === '0' && c.dataset.colIndex === '0')!;
    act(() => first.focus());
    await user.keyboard('{ArrowDown}');
    const active = document.activeElement as HTMLElement;
    expect(inner.contains(active)).toBe(true);
    expect(active.dataset.rowIndex).toBe('1');
  });
});

describe('tree data', () => {
  it('shows expanders and indentation in the first data column', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(
      <DataGrid<Node> data={tree} columns={treeColumns} getSubRows={(r) => r.children} enableRowSelection aria-label="Tree" />,
    );
    expect(columnTexts(container, 'name')).toEqual(['Alpha', 'Beta']);
    expect(screen.getByRole('treegrid', { name: 'Tree' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Expand row' })[0]);
    expect(columnTexts(container, 'name')).toEqual(['Alpha', 'Alpha one', 'Alpha two', 'Beta']);
    const child = container.querySelector<HTMLElement>('[data-row-id="a1"]')!;
    expect(child).toHaveAttribute('aria-level', '2');
    expect(child.querySelector('.mdg-tree-cell')!.getAttribute('style')).toContain('calc(1 * var(--dg-group-indent))');
    // Leaves get a spacer instead of a button so labels stay aligned.
    expect(child.querySelector('.mdg-expander-spacer')).not.toBeNull();
  });

  it('honours treeColumnId and toggles with Enter', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(
      <DataGrid<Node> data={tree} columns={treeColumns} getSubRows={(r) => r.children} treeColumnId="amount" />,
    );
    expect(container.querySelector('[data-column-id="name"][data-tree]')).toBeNull();
    const cell = container.querySelector<HTMLElement>('[data-row-id="b"] [data-column-id="amount"]')!;
    expect(cell).toHaveAttribute('data-tree');
    act(() => cell.focus());
    await user.keyboard('{Enter}');
    expect(columnTexts(container, 'name')).toEqual(['Alpha', 'Beta', 'Beta one']);
  });

  it('totals top-level rows with footerAggregation "roots" and leaves by default', () => {
    const { container, rerender } = renderWithMantine(<DataGrid<Node> data={tree} columns={treeColumns} getSubRows={(r) => r.children} />);
    const footer = () => container.querySelector('.mdg-tfoot [aria-colindex="2"]')!.textContent;
    // Roots: Alpha (30) + Beta (6)
    expect(footer()).toContain('36');
    rerender(
      <DataGrid<Node>
        data={tree}
        columns={[treeColumns[0], { ...treeColumns[1], meta: { footerAggregation: true } }]}
        getSubRows={(r) => r.children}
      />,
    );
    // Leaves: Alpha one (10) + Alpha two x (20) + Beta one (5)
    expect(footer()).toContain('35');
    rerender(
      <DataGrid<Node>
        data={[...tree, { id: 'c', name: 'Gamma', amount: 7, children: [{ id: 'c1', name: 'Gamma one', amount: 1 }] }]}
        columns={treeColumns}
        getSubRows={(r) => r.children}
      />,
    );
    expect(footer()).toContain('43');
  });

  it('expandAll / collapseAll through the API and the toolbar', async () => {
    const user = userEvent.setup();
    const apiRef = createRef<DataGridApi<Node>>();
    const { container } = renderWithMantine(
      <DataGrid<Node> apiRef={apiRef} data={tree} columns={treeColumns} getSubRows={(r) => r.children} />,
    );
    act(() => apiRef.current!.expandAll());
    expect(columnTexts(container, 'name')).toEqual(['Alpha', 'Alpha one', 'Alpha two', 'Alpha two x', 'Beta', 'Beta one']);
    act(() => apiRef.current!.collapseAll());
    expect(columnTexts(container, 'name')).toEqual(['Alpha', 'Beta']);
    await user.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(columnTexts(container, 'name')).toHaveLength(6);
  });
});

describe('grouped column headers', () => {
  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'name', header: 'Name' },
    {
      id: 'pay',
      header: 'Pay',
      columns: [
        { accessorKey: 'salary', header: 'Salary' },
        { accessorKey: 'department', header: 'Department' },
      ],
    },
  ];

  it('places headers on a grid: groups span columns, ungrouped columns span both rows', () => {
    const { container } = renderWithMantine(<DataGrid<Employee> data={employees} columns={columns} />);
    const header = container.querySelector<HTMLElement>('.mdg-thead')!;
    expect(header).toHaveAttribute('data-grid');
    expect(header.style.gridTemplateColumns).toBe('minmax(160px, 160fr) minmax(160px, 160fr) minmax(160px, 160fr)');
    const name = screen.getByRole('columnheader', { name: /Name/ });
    expect(name).toHaveAttribute('aria-rowspan', '2');
    expect(name.style.gridRow).toBe('1 / 3');
    const pay = screen.getByRole('columnheader', { name: 'Pay' });
    expect(pay).toHaveAttribute('aria-colspan', '2');
    expect(pay).toHaveAttribute('data-group-header');
    expect(pay.style.gridColumn).toBe('2 / span 2');
    // No empty placeholder cells are rendered.
    expect(container.querySelectorAll('.mdg-th[data-placeholder]')).toHaveLength(0);
  });

  it('keeps single-row headers as flex rows', () => {
    const { container } = renderWithMantine(<DataGrid<Employee> data={employees} columns={employeeColumns} />);
    expect(container.querySelector('.mdg-thead')).not.toHaveAttribute('data-grid');
  });
});

describe('copy to clipboard', () => {
  it('copies visible rows as tab-separated text and announces it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    renderWithMantine(
      <DataGrid<Employee>
        data={employees.slice(0, 2)}
        columns={[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'salary', header: 'Salary' },
        ]}
        enableExport
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Copy to clipboard' }));
    expect(writeText).toHaveBeenCalledWith('Name\tSalary\nAlice\t120000\nBob\t80000');
    await waitFor(() => expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('Copied 2 rows to the clipboard'));
  });

  it('includes every tree level, parents first', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    const apiRef = createRef<DataGridApi<Node>>();
    renderWithMantine(<DataGrid<Node> apiRef={apiRef} data={tree} columns={treeColumns} getSubRows={(r) => r.children} />);
    const result = await apiRef.current!.copyToClipboard({ includeHeaders: false, columns: ['name'] });
    expect(result.text.split('\n')).toEqual(['Alpha', 'Alpha one', 'Alpha two', 'Alpha two x', 'Beta', 'Beta one']);
  });
});

describe('aggregated cells', () => {
  it('formats group aggregates with formatAggregate, then format', () => {
    const { container } = renderWithMantine(
      <DataGrid<Employee>
        data={employees}
        columns={[
          { accessorKey: 'department', header: 'Department' },
          { accessorKey: 'salary', header: 'Salary', aggregationFn: 'sum', meta: { formatAggregate: (v) => `Σ ${v as number}` } },
          { id: 'max', accessorFn: (r) => r.salary, header: 'Max', aggregationFn: 'max', meta: { format: (v) => `$${v as number}` } },
        ]}
        enableGrouping
        defaultGrouping={['department']}
      />,
    );
    const engineering = container.querySelector<HTMLElement>('[data-group]')!;
    expect(within(engineering).getByText('Σ 255000')).toBeInTheDocument();
    expect(within(engineering).getByText('$135000')).toBeInTheDocument();
  });
});
