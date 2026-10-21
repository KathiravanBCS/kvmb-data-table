import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid, type CellEditorProps, type DataGridApi } from '../../src';
import { columnTexts, employees, renderWithMantine, type Employee } from '../utils';

const cell = (container: HTMLElement, rowIndex: number, columnId: string) =>
  container.querySelector<HTMLElement>(`.mdg-tbody [data-row-index="${rowIndex}"][data-column-id="${columnId}"]`)!;

const columns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name', meta: { validate: (v) => (String(v).trim() ? null : 'Name is required') } },
  { accessorKey: 'department', header: 'Department', meta: { editable: false } },
  { accessorKey: 'salary', header: 'Salary', meta: { filterVariant: 'number', validate: async (v) => ((v as number) < 0 ? 'Must be positive' : null) } },
  { accessorKey: 'address.city', header: 'City' },
  { accessorKey: 'active', header: 'Active', meta: { filterVariant: 'boolean' } },
];

describe('cell editing', () => {
  it('edits on double click, commits with Enter and calls onRowUpdate', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 0, 'name'));
    const input = within(cell(container, 0, 'name')).getByRole('textbox', { name: 'Name' });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, 'Alicia{Enter}');
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledTimes(1));
    const [updated, ctx] = onRowUpdate.mock.calls[0];
    expect(updated).toMatchObject({ id: '1', name: 'Alicia', salary: 120000 });
    expect(ctx).toMatchObject({ rowId: '1', changes: { name: 'Alicia' }, originalRow: employees[0] });
    // Optimistic value is displayed even though `data` did not change
    expect(columnTexts(container, 'name')[0]).toBe('Alicia');
    expect(cell(container, 0, 'name')).toHaveFocus();
  });

  it('cancels with Escape and leaves read-only columns alone', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 1, 'name'));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'xyz{Escape}');
    expect(columnTexts(container, 'name')[1]).toBe('Bob');
    expect(onRowUpdate).not.toHaveBeenCalled();
    await user.dblClick(cell(container, 1, 'department'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(cell(container, 1, 'department')).toHaveAttribute('aria-readonly', 'true');
  });

  it('shows sync validation errors and blocks the save', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 0, 'name'));
    await user.clear(screen.getByRole('textbox', { name: 'Name' }));
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(cell(container, 0, 'name')).toHaveAttribute('aria-invalid', 'true');
    expect(onRowUpdate).not.toHaveBeenCalled();
  });

  it('runs async validators on number editors', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 0, 'salary'));
    const input = screen.getByRole('textbox', { name: 'Salary' });
    await user.clear(input);
    await user.type(input, '-5{Enter}');
    expect(await screen.findByText('Must be positive')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, '130000{Enter}');
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledWith(expect.objectContaining({ salary: 130000 }), expect.anything()));
  });

  it('rolls back optimistic updates when the save fails', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    let reject!: (e: Error) => void;
    const onRowUpdate = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} onEditError={onError} />);
    await user.dblClick(cell(container, 0, 'address_city'));
    const input = screen.getByRole('textbox', { name: 'City' });
    await user.clear(input);
    await user.type(input, 'Rome{Enter}');
    expect(columnTexts(container, 'address_city')[0]).toBe('Rome');
    expect(onRowUpdate.mock.calls[0][0]).toMatchObject({ address: { city: 'Rome' } });
    expect(cell(container, 0, 'address_city')).toHaveAttribute('data-saving');
    await act(async () => reject(new Error('Server down')));
    await waitFor(() => expect(columnTexts(container, 'address_city')[0]).toBe('Berlin'));
    expect(cell(container, 0, 'address_city')).toHaveAttribute('data-save-error');
    expect(screen.getByRole('img', { name: 'Save failed: Server down' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('waits for the server before applying when optimistic updates are off', async () => {
    const user = userEvent.setup();
    let resolve!: (row: Employee) => void;
    const onRowUpdate = vi.fn(() => new Promise<Employee>((r) => (resolve = r)));
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing optimisticUpdates={false} onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 0, 'name'));
    const input = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(input);
    await user.type(input, 'Al{Enter}');
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled(); // pending
    await act(async () => resolve({ ...employees[0], name: 'AL (server)' }));
    await waitFor(() => expect(columnTexts(container, 'name')[0]).toBe('AL (server)'));
  });

  it('moves to the next editable cell with Tab', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 0, 'name'));
    await user.keyboard('{Tab}');
    // Department is read-only, so Tab skips to Salary
    await waitFor(() => expect(within(cell(container, 0, 'salary')).getByRole('textbox')).toHaveFocus());
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    await waitFor(() => expect(within(cell(container, 0, 'name')).getByRole('textbox')).toHaveFocus());
  });

  it('starts editing from the keyboard (Enter / typing) and toggles checkboxes', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    cell(container, 2, 'name').focus();
    await user.keyboard('Z');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Z');
    await user.keyboard('{Escape}');
    cell(container, 2, 'active').focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('checkbox', { name: 'Active' }));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: '3', active: false }), expect.anything()));
  });

  it('commits when focus leaves the editor', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(<DataGrid data={employees} columns={columns} enableEditing onRowUpdate={onRowUpdate} />);
    await user.dblClick(cell(container, 0, 'name'));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(cell(container, 3, 'department'));
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice!' }), expect.anything()));
  });

  it('honours isRowEditable and editable functions', async () => {
    const user = userEvent.setup();
    const { container } = renderWithMantine(
      <DataGrid
        data={employees}
        columns={[{ accessorKey: 'name', header: 'Name', meta: { editable: (row) => row.id !== '2' } }]}
        enableEditing
        isRowEditable={(row) => row.active || row.id === '2'}
      />,
    );
    await user.dblClick(cell(container, 1, 'name')); // editable column fn says no
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.dblClick(cell(container, 4, 'name')); // Eve is inactive
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.dblClick(cell(container, 0, 'name'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('supports custom editor components', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    function Stepper({ value, onChange, onCommit }: CellEditorProps<Employee, unknown>) {
      return (
        <button type="button" onClick={() => { onChange((value as number) + 1); }} onDoubleClick={onCommit}>
          step {String(value)}
        </button>
      );
    }
    const { container } = renderWithMantine(
      <DataGrid data={employees} columns={[{ accessorKey: 'salary', header: 'Salary', meta: { editor: Stepper } }]} enableEditing onRowUpdate={onRowUpdate} />,
    );
    await user.dblClick(cell(container, 0, 'salary'));
    await user.click(screen.getByRole('button', { name: 'step 120000' }));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledWith(expect.objectContaining({ salary: 120001 }), expect.anything()));
  });

  it('requires setValue for accessorFn columns and uses it', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(
      <DataGrid
        data={employees}
        columns={[
          { id: 'upper', header: 'Upper', accessorFn: (r) => r.name.toUpperCase() },
          { id: 'lower', header: 'Lower', accessorFn: (r) => r.name.toLowerCase(), meta: { setValue: (row, v) => ({ ...row, name: String(v) }) } },
        ]}
        enableEditing
        onRowUpdate={onRowUpdate}
      />,
    );
    await user.dblClick(cell(container, 0, 'upper'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.dblClick(cell(container, 0, 'lower'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Zed{Enter}');
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zed' }), expect.anything()));
  });
});

describe('row editing', () => {
  it('edits a full row with save / cancel actions and row validation', async () => {
    const user = userEvent.setup();
    const onRowUpdate = vi.fn();
    const { container } = renderWithMantine(
      <DataGrid
        data={employees}
        columns={columns}
        enableEditing
        editMode="row"
        onRowUpdate={onRowUpdate}
        validateRow={(row) => (row.name === 'Bad' ? { name: 'Row rule failed' } : null)}
      />,
    );
    const row0 = container.querySelector<HTMLElement>('.mdg-tbody [role="row"]')!;
    await user.click(within(row0).getByRole('button', { name: 'Edit' }));
    expect(within(row0).getAllByRole('textbox').length).toBeGreaterThanOrEqual(3);
    const name = within(row0).getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Bad');
    await user.click(within(row0).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Row rule failed')).toBeInTheDocument();
    await user.clear(name);
    await user.type(name, 'Good');
    const city = within(row0).getByRole('textbox', { name: 'City' });
    await user.clear(city);
    await user.type(city, 'Oslo');
    await user.click(within(row0).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onRowUpdate).toHaveBeenCalledTimes(1));
    expect(onRowUpdate.mock.calls[0][1].changes).toEqual({ name: 'Good', address_city: 'Oslo' });
    await user.click(within(row0).getByRole('button', { name: 'Edit' }));
    await user.click(within(row0).getByRole('button', { name: 'Cancel' }));
    expect(within(row0).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('can be driven programmatically through the API', async () => {
    const api = createRef<DataGridApi<Employee>>();
    const onRowUpdate = vi.fn();
    function Harness() {
      const [data, setData] = useState(employees);
      return (
        <DataGrid
          data={data}
          columns={columns}
          enableEditing
          editMode="row"
          editTrigger="manual"
          apiRef={api}
          onRowUpdate={(row) => {
            onRowUpdate(row);
            setData((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          }}
        />
      );
    }
    const { container } = renderWithMantine(<Harness />);
    act(() => api.current!.startEditing('2', 'salary'));
    const input = await screen.findByRole('textbox', { name: 'Salary' });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.setup().clear(input);
    await userEvent.setup().type(input, '1');
    let ok = false;
    await act(async () => {
      ok = await api.current!.commitEditing();
    });
    expect(ok).toBe(true);
    expect(onRowUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: '2', salary: 1 }));
    expect(columnTexts(container, 'salary')[1]).toBe('1');
  });
});
