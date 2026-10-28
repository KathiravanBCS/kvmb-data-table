import { ActionIcon, Badge, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { generateWorkload, tone, type Resource, type WorkloadTask } from '../recipes';

const resources = generateWorkload();

const statusColor: Record<WorkloadTask['status'], string> = {
  Done: 'green',
  'In progress': 'blue',
  'Not started': 'gray',
  Overdue: 'red',
};

const taskColumns: ColumnDef<WorkloadTask>[] = [
  { accessorKey: 'serviceItem', header: 'Service item', size: 160 },
  { accessorKey: 'task', header: 'Task', size: 180 },
  { accessorKey: 'dueDate', header: 'Due', size: 110, meta: { filterVariant: 'date' } },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 130,
    cell: ({ getValue }) => {
      const status = getValue<WorkloadTask['status']>();
      return (
        <Badge size="sm" variant={status === 'Overdue' ? 'filled' : 'light'} color={status === 'Overdue' ? 'red.9' : statusColor[status]}>
          {status}
        </Badge>
      );
    },
  },
  { accessorKey: 'hours', header: 'Hours', size: 90, aggregationFn: 'sum', meta: { align: 'right' } },
];

/** Detail panel: one card per engagement with its tasks grouped by service item. */
function EngagementPanel({ resource }: { resource: Resource }) {
  return (
    <Stack gap="sm">
      {resource.engagements.map((engagement) => (
        <Paper key={engagement.id} withBorder p="sm" radius="md">
          <Group justify="space-between" mb="xs">
            <div>
              <Text fw={600} size="sm">
                {engagement.name}
              </Text>
              <Text size="xs" className="mdg-muted">
                {engagement.client} · {engagement.start} → {engagement.end}
              </Text>
            </div>
            <Badge variant="default">{engagement.tasks.length} tasks</Badge>
          </Group>
          <DataGrid<WorkloadTask>
            data={engagement.tasks}
            columns={taskColumns}
            defaultGrouping={['serviceItem']}
            defaultExpanded
            enableGrouping
            enableToolbar={false}
            density="compact"
            aria-label={`Tasks for ${engagement.name}`}
          />
        </Paper>
      ))}
    </Stack>
  );
}

const columns: ColumnDef<Resource>[] = [
  {
    accessorKey: 'name',
    header: 'Resource',
    size: 200,
    cell: ({ row }) => (
      <div>
        <Text size="sm" fw={500} truncate>
          {row.original.name}
        </Text>
        <Text size="xs" className="mdg-muted" truncate>
          {row.original.role}
        </Text>
      </div>
    ),
  },
  { id: 'engagements', accessorFn: (r) => r.engagements.length, header: 'Engagements', size: 150, meta: { align: 'right' } },
  { accessorKey: 'taskCount', header: 'Tasks', size: 110, meta: { align: 'right' } },
  {
    accessorKey: 'overdue',
    header: 'Overdue',
    size: 130,
    meta: { align: 'center' },
    cell: ({ getValue }) =>
      getValue<number>() > 0 ? (
        <Badge size="sm" color="red.9" variant="filled">
          {getValue<number>()} overdue
        </Badge>
      ) : (
        <Text size="xs" className="mdg-muted">
          –
        </Text>
      ),
  },
  { accessorKey: 'plannedHours', header: 'Planned (h)', size: 140, meta: { align: 'right' } },
  {
    id: 'utilization',
    header: 'Utilization',
    size: 140,
    accessorFn: (r) => Math.round((r.plannedHours / (r.capacity * 2)) * 100),
    meta: {
      align: 'right',
      format: (v) => `${v as number}%`,
      // Highlight over-allocated people.
      cellStyle: (cell) =>
        (cell.getValue() as number) > 100
          ? { background: 'var(--mantine-color-red-light)', color: tone('red'), fontWeight: 600 }
          : undefined,
    },
  },
  {
    id: 'assign',
    header: () => <span className="mdg-sr-only">Assign</span>,
    size: 56,
    enableSorting: false,
    meta: { align: 'center', exportable: false },
    cell: ({ row }) => (
      <Tooltip label={`Assign task to ${row.original.name}`}>
        <ActionIcon variant="light" size="sm" aria-label={`Assign task to ${row.original.name}`} onClick={(e) => e.stopPropagation()}>
          <IconPlus size={14} />
        </ActionIcon>
      </Tooltip>
    ),
  },
];

export default function ResourceWorkloadDemo() {
  return (
    <DataGrid<Resource>
      data={resources}
      columns={columns}
      getRowId={(r) => r.id}
      renderDetailPanel={({ row }) => <EngagementPanel resource={row.original} />}
      defaultExpanded={{ r0: true }}
      enableToolbar={false}
      rowHeight={52}
      aria-label="Resource workload"
    />
  );
}
