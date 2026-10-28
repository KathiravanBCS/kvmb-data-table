import { useMemo, useState } from 'react';
import { Badge, Select } from '@mantine/core';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { CURRENCIES, generatePartnerSummary, inr, tone, type PartnerNode } from '../recipes';

const allRows = generatePartnerSummary();
const kindLabel: Record<PartnerNode['kind'], string> = { partner: 'Partner', customer: 'Customer', proposal: 'Proposal' };

const highlight = {
  background: 'light-dark(var(--mantine-color-orange-0), rgba(253, 126, 20, 0.12))',
  fontWeight: 700,
};

const columns: ColumnDef<PartnerNode>[] = [
  {
    accessorKey: 'name',
    header: 'Partner / customer / proposal',
    size: 280,
    cell: ({ row }) => (
      <>
        <span style={{ fontWeight: row.depth === 0 ? 700 : row.depth === 1 ? 500 : 400 }}>{row.original.name}</span>
        {row.depth > 0 && (
          <Badge size="xs" variant="default" ml={6}>
            {kindLabel[row.original.kind]}
          </Badge>
        )}
      </>
    ),
    footer: () => 'Totals',
  },
  {
    accessorKey: 'customers',
    header: 'Customers',
    size: 130,
    aggregationFn: 'sum',
    meta: { align: 'right', footerAggregation: 'roots' },
  },
  {
    accessorKey: 'proposals',
    header: 'Proposals',
    size: 130,
    aggregationFn: 'sum',
    meta: { align: 'right', footerAggregation: 'roots' },
  },
  {
    id: 'amount',
    header: 'Proposal amount',
    columns: [
      ...CURRENCIES.map((currency): ColumnDef<PartnerNode> => ({
        accessorKey: currency,
        header: currency,
        size: 120,
        aggregationFn: 'sum',
        // Parent rows already hold the sum of their children: total the top level only.
        meta: { align: 'right', format: (v) => (v ? inr(v) : '–'), footerAggregation: 'roots', formatAggregate: inr },
      })),
      {
        accessorKey: 'totalInr',
        header: 'Total (INR)',
        size: 150,
        aggregationFn: 'sum',
        meta: {
          align: 'right',
          format: inr,
          footerAggregation: 'roots',
          formatAggregate: inr,
          cellStyle: highlight,
          headerStyle: { ...highlight, color: tone('orange') },
          footerStyle: highlight,
        },
      },
    ],
  },
];

export default function PartnerSummaryDemo() {
  const [year, setYear] = useState('2026');
  const data = useMemo(() => allRows.filter((r) => String(r.year) === year), [year]);
  return (
    <DataGrid<PartnerNode>
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      getSubRows={(r) => r.children}
      withColumnBorders
      defaultExpanded={{ [`${year}-p0`]: true }}
      enableDensityToggle={false}
      enableHiding={false}
      toolbarActions={
        <Select
          size="xs"
          w={110}
          aria-label="Financial year"
          data={['2025', '2026']}
          value={year}
          allowDeselect={false}
          onChange={(v) => v && setYear(v)}
        />
      }
      showFooter
      labels={{ aggregateLabels: {} }}
      height={480}
      aria-label="Partner financial summary"
    />
  );
}
