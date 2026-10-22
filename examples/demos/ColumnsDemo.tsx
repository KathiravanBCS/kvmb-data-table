import { Anchor, Avatar, Group, Progress, Text } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { currency, generateEmployees, type Employee } from '../data';

const data = generateEmployees(40);

const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'name',
    header: 'Employee',
    size: 260,
    // Custom cell renderer with access to the full row
    cell: ({ row, getValue }) => (
      <Group gap="xs" wrap="nowrap">
        <Avatar size="sm" radius="xl" color="initials" name={getValue<string>()} />
        <div style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {getValue<string>()}
          </Text>
          <Anchor size="xs" href={`mailto:${row.original.email}`} truncate>
            {row.original.email}
          </Anchor>
        </div>
      </Group>
    ),
  },
  // Nested accessor: column id becomes `location_country`
  { accessorKey: 'location.country', header: 'Country' },
  {
    accessorKey: 'salary',
    header: () => (
      <Text fw={700} c="teal" size="sm">
        Salary (USD)
      </Text>
    ),
    meta: {
      align: 'right',
      format: (v) => currency.format(v as number),
      // Conditional cell styling
      cellStyle: (cell) =>
        (cell.getValue() as number) > 170000 ? { color: 'var(--mantine-color-teal-filled)', fontWeight: 600 } : undefined,
    },
  },
  {
    id: 'tenure',
    header: 'Tenure',
    accessorFn: (row) => new Date().getFullYear() - Number(row.startDate.slice(0, 4)),
    cell: ({ getValue }) => <Progress value={Math.min(100, getValue<number>() * 7)} size="sm" aria-label={`${getValue<number>()} years`} />,
    meta: { filterVariant: 'number' },
  },
  { accessorKey: 'role', header: 'Role (wrapped text)', size: 120, meta: { wrap: true } },
  { accessorKey: 'active', header: 'Active', meta: { align: 'center' } },
];

export default function ColumnsDemo() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={420}
      striped
      withColumnBorders
      dynamicRowHeight
      rowHeight={52}
      getRowClassName={(row) => (row.original.active ? undefined : 'inactive-row')}
      getRowStyle={(row) => (row.original.active ? undefined : { opacity: 0.55 })}
      aria-label="Employees with custom columns"
    />
  );
}
