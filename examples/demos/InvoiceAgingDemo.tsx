import { useMemo } from 'react';
import { Badge, Group, Paper, SimpleGrid, Text } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { AGING_BUCKETS, generateInvoices, inr, tone, type AgingBucket, type Invoice } from '../recipes';

const invoices = generateInvoices();

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: 'bucket',
    header: 'Aging',
    // Groups follow the bucket order rather than the alphabet.
    sortingFn: (a, b) => AGING_BUCKETS.indexOf(a.original.bucket) - AGING_BUCKETS.indexOf(b.original.bucket),
  },
  { accessorKey: 'number', header: 'Invoice', size: 150 },
  { accessorKey: 'customer', header: 'Customer', size: 170 },
  { accessorKey: 'invoiceDate', header: 'Invoiced', size: 120 },
  { accessorKey: 'dueDate', header: 'Due', size: 110 },
  {
    accessorKey: 'daysOverdue',
    header: 'Days late',
    size: 120,
    aggregationFn: 'max',
    meta: { align: 'right' },
    cell: ({ getValue }) => {
      const days = getValue<number>();
      return <span style={{ color: days > 60 ? tone('red') : undefined, fontWeight: days > 60 ? 600 : undefined }}>{days}</span>;
    },
  },
  { accessorKey: 'amount', header: 'Amount', size: 130, aggregationFn: 'sum', meta: { align: 'right', format: inr } },
  {
    accessorKey: 'outstanding',
    header: 'Outstanding',
    size: 150,
    aggregationFn: 'sum',
    meta: { align: 'right', format: inr, footerAggregation: true, formatAggregate: inr },
  },
];

const bucketColor: Record<AgingBucket, string> = {
  'Less than 15 days': 'green',
  '15 – 30 days': 'yellow',
  '31 – 60 days': 'orange',
  'Greater than 60 days': 'red',
};

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="xs" tt="uppercase" fw={600} className="mdg-muted">
        {label}
      </Text>
      <Text fw={700} size="xl">
        {value}
      </Text>
      <Text size="xs" className="mdg-muted">
        {hint}
      </Text>
    </Paper>
  );
}

export default function InvoiceAgingDemo() {
  const stats = useMemo(() => {
    const total = invoices.reduce((n, i) => n + i.outstanding, 0);
    const over60 = invoices.filter((i) => i.bucket === 'Greater than 60 days');
    return {
      total,
      count: invoices.length,
      over60: over60.reduce((n, i) => n + i.outstanding, 0),
      over60Count: over60.length,
      avgDays: Math.round(invoices.reduce((n, i) => n + i.daysOverdue, 0) / invoices.length),
    };
  }, []);

  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="sm">
        <StatCard label="Outstanding" value={`₹ ${inr(stats.total)}`} hint={`${stats.count} open invoices`} />
        <StatCard label="> 60 days" value={`₹ ${inr(stats.over60)}`} hint={`${stats.over60Count} invoices`} />
        <StatCard label="Avg. days overdue" value={String(stats.avgDays)} hint="across all invoices" />
        <StatCard label="Customers" value={String(new Set(invoices.map((i) => i.customer)).size)} hint="with open balances" />
      </SimpleGrid>
      <DataGrid<Invoice>
        data={invoices}
        columns={columns}
        getRowId={(r) => r.id}
        enableGrouping
        enableExport
        enableFiltering
        defaultGrouping={['bucket']}
        defaultSorting={[{ id: 'bucket', desc: false }]}
        // The bucket is shown in the group header, so hide its column.
        defaultColumnVisibility={{ bucket: false }}
        defaultExpanded
        renderGroupHeader={({ row, value, count }) => (
          <Group justify="space-between" w="100%" wrap="nowrap">
            <Group gap="xs">
              <Text fw={600} size="sm">
                {String(value)}
              </Text>
              <Badge size="sm" variant="light" color={bucketColor[value as AgingBucket]}>
                {count}
              </Badge>
            </Group>
            <Text size="sm" fw={600}>
              ₹ {inr(row.getValue('outstanding'))}
            </Text>
          </Group>
        )}
        height={460}
        aria-label="Invoice outstanding by aging"
      />
    </>
  );
}
