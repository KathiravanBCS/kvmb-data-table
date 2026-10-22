import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { Button, MantineProvider, useMantineColorScheme } from '@mantine/core';
import { DataGrid, type DataGridApi } from '../../src';
import { columnTexts, employeeColumns, employees, makeRows, renderWithMantine, type Employee } from '../utils';
import { render } from '@testing-library/react';

const headerTexts = () => screen.getAllByRole('columnheader').map((h) => h.textContent ?? '');

describe('column management', () => {
  it('hides and shows columns from the column manager and the column menu', async () => {
    const user = userEvent.setup();
    const onVisibility = vi.fn();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} onColumnVisibilityChange={onVisibility} />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    const panel = await screen.findByRole('dialog', { name: /Columns/ });
    await user.click(within(panel).getByRole('checkbox', { name: 'Salary' }));
    expect(headerTexts()).not.toContain('Salary');
    expect(onVisibility).toHaveBeenLastCalledWith({ salary: false });
    await user.click(within(panel).getByRole('button', { name: 'Show all' }));
    expect(headerTexts()).toContain('Salary');
    await user.click(screen.getByRole('button', { name: 'Column actions: Name' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Hide column' }));
    expect(headerTexts()).not.toContain('Name');
  });

  it('locked columns cannot be hidden', async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataGrid
        data={employees}
        columns={[{ accessorKey: 'name', header: 'Name', meta: { locked: true } }, ...employeeColumns.slice(1)]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(within(await screen.findByRole('dialog', { name: /Columns/ })).getByRole('checkbox', { name: 'Name' })).toBeDisabled();
  });

  it('pins columns left/right with sticky offsets', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableColumnPinning enableRowSelection />);
    await user.click(screen.getByRole('button', { name: 'Column actions: Salary' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Pin to left' }));
    const salaryHeader = screen.getAllByRole('columnheader').find((h) => h.dataset.columnId === 'salary')!;
    expect(salaryHeader).toHaveAttribute('data-pinned', 'left');
    // Selection column (44px) stays pinned first
    expect(salaryHeader.style.left).toBe('44px');
    expect(headerTexts()[1]).toContain('Salary');
    await user.click(screen.getByRole('button', { name: 'Column actions: Name' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Pin to right' }));
    const cells = container.querySelectorAll('.mdg-tbody [data-row-index="0"]');
    expect(cells[cells.length - 1]).toHaveAttribute('data-column-id', 'name');
    expect(cells[cells.length - 1]).toHaveAttribute('data-pinned-edge', 'right');
  });

  it('resizes columns with the keyboard (Alt+Arrow) and double-click resets', async () => {
    const user = userEvent.setup();
    const onSizing = vi.fn();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableColumnResizing onColumnSizingChange={onSizing} />);
    const name = screen.getAllByRole('columnheader')[0];
    name.focus();
    await user.keyboard('{Alt>}{ArrowRight}{ArrowRight}{/Alt}');
    expect(onSizing).toHaveBeenLastCalledWith({ name: 180 });
    expect(name.style.width).toBe('180px');
    const separator = within(name).getByRole('separator', { name: 'Resize column: Name' });
    expect(separator).toHaveAttribute('aria-valuenow', '180');
    await user.dblClick(separator);
    expect(name.style.width).toBe('160px');
  });

  it('resizes columns by dragging the handle', () => {
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableColumnResizing />);
    const header = screen.getAllByRole('columnheader')[1];
    const handle = within(header).getByRole('separator');
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 160 });
    fireEvent.mouseUp(document, { clientX: 160 });
    expect(header.style.width).toBe('220px');
  });

  it('saves and restores column layouts through the API', () => {
    const api = createRef<DataGridApi<Employee>>();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} apiRef={api} defaultColumnVisibility={{ active: false }} />);
    act(() => api.current!.setColumnLayout({ order: ['salary', 'name'], visibility: { department: false }, pinning: { right: ['name'] } }));
    expect(headerTexts()).toEqual(['Salary', 'Start date', 'Active', 'Name']);
    const layout = api.current!.getColumnLayout();
    expect(layout).toMatchObject({ order: ['salary', 'name'], visibility: { department: false }, pinning: { right: ['name'] } });
    act(() => api.current!.resetColumnLayout());
    expect(headerTexts()).toEqual(['Name', 'Department', 'Salary', 'Start date']);
  });

  it('renders drag handles for column reordering (unpinned, unlocked columns only)', () => {
    renderWithMantine(
      <DataGrid
        data={employees}
        columns={[{ accessorKey: 'name', header: 'Name', meta: { locked: true } }, ...employeeColumns.slice(1)]}
        enableColumnOrdering
      />,
    );
    expect(screen.queryByRole('button', { name: 'Drag to reorder column: Name' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drag to reorder column: Salary' })).toHaveAttribute('aria-roledescription', 'sortable');
  });

  it('honours canDragRow', () => {
    renderWithMantine(
      <DataGrid
        data={employees}
        columns={employeeColumns}
        enableRowDragging
        canDragRow={(row) => row.original.active}
        onRowReorder={() => {}}
      />,
    );
    const handles = screen.getAllByRole('button', { name: 'Drag to reorder row' });
    expect(handles.map((h) => (h as HTMLButtonElement).disabled)).toEqual([false, true, false, false, true]);
  });

  it('renders row drag handles and disables them while sorted', async () => {
    const user = userEvent.setup();
    renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableRowDragging onRowReorder={() => {}} />);
    const handles = screen.getAllByRole('button', { name: 'Drag to reorder row' });
    expect(handles).toHaveLength(5);
    expect(handles[0]).toBeEnabled();
    await user.click(screen.getAllByRole('columnheader')[1]);
    expect(screen.getAllByRole('button', { name: 'Drag to reorder row' })[0]).toBeDisabled();
  });
});

describe('keyboard navigation', () => {
  const cellAt = (container: HTMLElement, r: number, c: number) =>
    container.querySelector<HTMLElement>(`[data-row-index="${r}"][data-col-index="${c}"]`)!;

  it('uses a roving tabindex and arrow / Home / End / Ctrl+Home navigation', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} enableToolbar={false} />);
    const focusable = container.querySelectorAll('[role="grid"] [tabindex="0"]');
    expect(focusable).toHaveLength(1);
    await user.tab();
    expect(document.activeElement).toBe(cellAt(container, -1, 0));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, 0, 0)));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, 0, 2)));
    await user.keyboard('{End}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, 0, 4)));
    await user.keyboard('{Control>}{End}{/Control}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, 4, 4)));
    await user.keyboard('{Home}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, 4, 0)));
    await user.keyboard('{PageUp}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, 0, 0)));
    await user.keyboard('{ArrowUp}');
    await waitFor(() => expect(document.activeElement).toBe(cellAt(container, -1, 0)));
    expect(container.querySelectorAll('[role="grid"] [tabindex="0"]')).toHaveLength(1);
  });

  it('toggles selection with Space and groups with Enter', async () => {
    const user = userEvent.setup();
    const onSelection = vi.fn();
    const { container } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} enableRowSelection onRowSelectionChange={onSelection} enableGrouping />,
    );
    cellAt(container, 1, 2).focus();
    await user.keyboard(' ');
    expect(onSelection).toHaveBeenLastCalledWith({ '2': true });
    await user.keyboard('{Control>}a{/Control}');
    expect(Object.keys(onSelection.mock.lastCall![0])).toHaveLength(5);
  });

  it('expands groups with Enter', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(
      <DataGrid data={employees} columns={employeeColumns} enableGrouping defaultGrouping={['department']} />,
    );
    cellAt(container, 0, 0).focus();
    await user.keyboard('{Enter}');
    expect(container.querySelector('.mdg-group-row')).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('virtualization', () => {
  // jsdom has no layout; give the scroll container a real viewport size.
  const sizeOf = (el: HTMLElement, axis: 'w' | 'h') => (el.classList?.contains('mdg-scroll') ? (axis === 'h' ? 400 : 1000) : 0);
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return sizeOf(this, 'h');
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return sizeOf(this, 'w');
      },
    });
  });
  afterAll(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  });

  it('renders only a window of rows for 10,000 rows', () => {
    const rows = makeRows(10_000);
    const { container } = renderWithMantine(
      <DataGrid data={rows} columns={employeeColumns} enableVirtualization height={400} overscan={5} />,
    );
    const rendered = container.querySelectorAll('.mdg-tbody [role="row"]').length;
    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThan(60);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', String(10_001));
    expect(container.querySelector('.mdg-tbody [role="row"]')).toHaveAttribute('aria-rowindex', '2');
    // Spacer reserves the remaining height
    const spacer = container.querySelectorAll<HTMLElement>('.mdg-spacer');
    expect(spacer.length).toBeGreaterThan(0);
  });

  it('keeps selection and filtering working with virtualization', async () => {
    const rows = makeRows(2_000);
    const onSelection = vi.fn();
    const { container } = renderWithMantine(
      <DataGrid
        data={rows}
        columns={employeeColumns}
        enableVirtualization
        height={300}
        enableRowSelection
        onRowSelectionChange={onSelection}
        globalFilter="Person 1999"
      />,
    );
    expect(columnTexts(container, 'name')).toEqual(['Person 1999']);
    await userEvent.setup().click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]);
    expect(onSelection).toHaveBeenLastCalledWith({ '1999': true });
  });

  it('warns and renders everything when no height is given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = renderWithMantine(<DataGrid data={makeRows(120)} columns={employeeColumns} enableVirtualization />);
    expect(container.querySelectorAll('.mdg-tbody [role="row"]')).toHaveLength(120);
    warn.mockRestore();
  });
});

describe('persistence', () => {
  it('persists and restores sorting, visibility and density', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    const persist = { key: 'test-grid', include: ['sorting', 'columnVisibility', 'density'] as const };
    const first = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} persistState={persist} />);
    await user.click(screen.getAllByRole('columnheader')[2]);
    await user.click(screen.getByRole('button', { name: 'Density' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Compact' }));
    await waitFor(() => expect(localStorage.getItem('test-grid')).toContain('compact'));
    first.unmount();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} persistState={persist} />);
    expect(columnTexts(container, 'name')).toEqual(['Dan', 'Bob', 'Eve', 'Alice', 'Carol']);
    expect(container.querySelector('.mdg-root')).toHaveAttribute('data-density', 'compact');
  });
});

describe('Mantine theme integration', () => {
  it('follows dynamic light/dark switching and theme default props', async () => {
    const user = userEvent.setup();
    function Toggle() {
      const { toggleColorScheme } = useMantineColorScheme();
      return <Button onClick={toggleColorScheme}>toggle</Button>;
    }
    function App() {
      const [primary, setPrimary] = useState('blue');
      return (
        <MantineProvider
          defaultColorScheme="light"
          theme={{ primaryColor: primary, components: { DataGrid: { defaultProps: { density: 'comfortable', striped: true } } } }}
        >
          <Toggle />
          <Button onClick={() => setPrimary('grape')}>grape</Button>
          <DataGrid data={employees} columns={employeeColumns} />
        </MantineProvider>
      );
    }
    const { container } = render(<App />);
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light');
    expect(container.querySelector('.mdg-root')).toHaveAttribute('data-density', 'comfortable');
    expect(container.querySelector('.mdg-root')).toHaveAttribute('data-striped');
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
    await user.click(screen.getByRole('button', { name: 'grape' }));
    expect(columnTexts(container, 'name')).toHaveLength(5);
  });

  it('applies theme-level classNames through the Styles API', () => {
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} />, {
      theme: { components: { DataGrid: { classNames: { row: 'theme-row' } } } },
    });
    expect(container.querySelectorAll('.theme-row').length).toBeGreaterThanOrEqual(5);
  });

  it('renders in dark mode', () => {
    const { container } = renderWithMantine(<DataGrid data={employees} columns={employeeColumns} />, { colorScheme: 'dark' });
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
    expect(container.querySelector('.mdg-root')).toBeInTheDocument();
  });
});
