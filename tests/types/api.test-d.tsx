import { describe, expectTypeOf, it } from 'vitest';
import type { ColumnDef, Row, Table } from '@tanstack/react-table';
import {
  DataGrid,
  createFilterCondition,
  type CellEditorProps,
  type DataGridApi,
  type DataGridProps,
  type DataGridQuery,
  type FilterGroup,
  type RowUpdateHandler,
} from '../../src';
import { exportToExcel, type ExcelExportResult } from '../../src/export';

type Employee = { id: string; name: string; department: string; salary: number; manager?: { name: string } };

describe('public types', () => {
  it('accepts plain TanStack column definitions with typed meta', () => {
    const columns: ColumnDef<Employee>[] = [
      { accessorKey: 'name', header: 'Name', meta: { filterVariant: 'text', validate: (v) => (v ? null : 'required') } },
      { accessorKey: 'salary', header: 'Salary', meta: { filterVariant: 'number', align: 'right', excelNumberFormat: '#,##0' } },
      { accessorKey: 'manager.name', header: 'Manager' },
      {
        id: 'computed',
        accessorFn: (r) => r.salary * 2,
        meta: { setValue: (row, value) => ({ ...row, salary: (value as number) / 2 }) },
      },
    ];
    expectTypeOf(columns).toMatchTypeOf<DataGridProps<Employee>['columns']>();

    // @ts-expect-error unknown filter variant
    const bad: ColumnDef<Employee>[] = [{ accessorKey: 'name', meta: { filterVariant: 'nope' } }];
    void bad;
  });

  it('types the generic component, callbacks and API', () => {
    const element = (
      <DataGrid<Employee>
        data={[]}
        columns={[]}
        getRowId={(row) => {
          expectTypeOf(row).toEqualTypeOf<Employee>();
          return row.id;
        }}
        onRowUpdate={async (row, ctx) => {
          expectTypeOf(row).toEqualTypeOf<Employee>();
          expectTypeOf(ctx.originalRow).toEqualTypeOf<Employee>();
          expectTypeOf(ctx.changes).toEqualTypeOf<Record<string, unknown>>();
        }}
        onQueryChange={(q) => expectTypeOf(q).toEqualTypeOf<DataGridQuery>()}
        renderBulkActions={({ selectedRows }) => {
          expectTypeOf(selectedRows).toEqualTypeOf<Row<Employee>[]>();
          return null;
        }}
        enableRowSelection={(row) => row.original.salary > 0}
      />
    );
    void element;

    // @ts-expect-error data must match the row type
    const wrong = <DataGrid<Employee> data={[{ id: 1 }]} columns={[]} />;
    void wrong;

    expectTypeOf<DataGridApi<Employee>['table']>().toEqualTypeOf<Table<Employee>>();
    expectTypeOf<DataGridApi<Employee>['getSelectedRows']>().returns.toEqualTypeOf<Row<Employee>[]>();
    expectTypeOf<RowUpdateHandler<Employee>>().parameter(0).toEqualTypeOf<Employee>();
  });

  it('keeps the filter model serialisable', () => {
    const model: FilterGroup = { type: 'group', id: 'root', logic: 'or', children: [createFilterCondition('salary', 'between', [1, 2])] };
    expectTypeOf(JSON.parse(JSON.stringify(model)) as FilterGroup).toEqualTypeOf<FilterGroup>();
    // @ts-expect-error functions are not valid filter values
    const invalid: FilterGroup = { type: 'group', id: 'x', logic: 'and', children: [{ type: 'condition', id: 'c', field: 'a', operator: 'eq', value: () => 1 }] };
    void invalid;
  });

  it('types editors and exports', () => {
    expectTypeOf<CellEditorProps<Employee, number>['value']>().toEqualTypeOf<number>();
    expectTypeOf(exportToExcel<Employee>).returns.resolves.toEqualTypeOf<ExcelExportResult>();
  });
});
