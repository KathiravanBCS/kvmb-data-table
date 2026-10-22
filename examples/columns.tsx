import { Badge, Group, Text } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import { DEPARTMENTS, SKILLS, currency, type Employee } from './data';

const options = (values: string[]) => values.map((v) => ({ value: v, label: v }));

/** Column set shared by most demos. Plain TanStack `ColumnDef`s plus grid `meta`. */
export const employeeColumns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name', size: 190, meta: { validate: (v) => (String(v ?? '').trim() ? null : 'Name is required') } },
  { accessorKey: 'email', header: 'Email', size: 240 },
  {
    accessorKey: 'department',
    header: 'Department',
    meta: { filterVariant: 'select', filterOptions: options(DEPARTMENTS), editor: 'select' },
    cell: ({ getValue }) => (
      <Badge variant="default" size="sm">
        {getValue<string>()}
      </Badge>
    ),
  },
  { accessorKey: 'role', header: 'Role', size: 130 },
  {
    accessorKey: 'salary',
    header: 'Salary',
    size: 130,
    aggregationFn: 'mean',
    aggregatedCell: ({ getValue }) => (
      <Text size="sm" fw={600}>
        {currency.format(getValue<number>())}
      </Text>
    ),
    meta: {
      filterVariant: 'number',
      footerAggregation: true,
      formatAggregate: (v) => currency.format(v as number),
      format: (v) => currency.format(v as number),
      excelNumberFormat: '"$"#,##0',
      validate: async (v) => {
        await new Promise((r) => setTimeout(r, 150)); // simulate a server-side rule
        return typeof v === 'number' && v >= 0 ? null : 'Salary must be a positive number';
      },
    },
  },
  { accessorKey: 'startDate', header: 'Start date', size: 130, meta: { filterVariant: 'date', editor: 'date' } },
  { accessorKey: 'active', header: 'Active', size: 100, meta: { filterVariant: 'boolean', align: 'center' } },
  {
    accessorKey: 'skills',
    header: 'Skills',
    size: 220,
    enableSorting: false,
    meta: {
      filterVariant: 'multiSelect',
      filterOptions: options(SKILLS),
      editor: 'multiSelect',
      exportValue: (_row, v) => (v as string[]).join('; '),
    },
    cell: ({ getValue }) => (
      <Group gap={4} wrap="nowrap">
        {getValue<string[]>().map((s) => (
          <Badge key={s} size="xs" variant="outline">
            {s}
          </Badge>
        ))}
      </Group>
    ),
  },
  { accessorKey: 'location.city', header: 'City', size: 130 },
];
