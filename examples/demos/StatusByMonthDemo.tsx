import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { generateStatusByMonth, inr, PROPOSAL_STATUSES, tone, type MonthStatusRow, type ProposalStatus } from '../recipes';

const data = generateStatusByMonth();

const color: Partial<Record<ProposalStatus, Parameters<typeof tone>[0]>> = { win: 'green', lost: 'red', sent: 'blue' };
const title = (s: ProposalStatus) => s.toUpperCase();

function numberColumn(status: ProposalStatus, kind: 'Count' | 'Amount'): ColumnDef<MonthStatusRow> {
  const tint = color[status];
  return {
    accessorKey: `${status}${kind}`,
    header: title(status),
    size: kind === 'Count' ? 76 : 120,
    aggregationFn: 'sum',
    meta: {
      align: 'right',
      format: kind === 'Amount' ? inr : undefined,
      formatAggregate: kind === 'Amount' ? inr : undefined,
      footerAggregation: true,
      cellStyle: tint ? { color: tone(tint), fontWeight: 600 } : undefined,
      footerStyle: tint ? { color: tone(tint) } : undefined,
    },
  };
}

const columns: ColumnDef<MonthStatusRow>[] = [
  { accessorKey: 'month', header: 'FY month', size: 120, enableSorting: false, footer: () => 'Totals' },
  { id: 'count', header: 'Status count', columns: PROPOSAL_STATUSES.map((s) => numberColumn(s, 'Count')) },
  { id: 'amount', header: 'Status amount (INR)', columns: PROPOSAL_STATUSES.map((s) => numberColumn(s, 'Amount')) },
];

export default function StatusByMonthDemo() {
  return (
    <DataGrid<MonthStatusRow>
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      withColumnBorders
      striped
      enableSorting={false}
      enableHiding={false}
      enableToolbar={false}
      showFooter
      // Totals are plain sums, so hide the "Sum:" prefix in the footer.
      labels={{ aggregateLabels: {} }}
      aria-label="Proposal status by financial-year month"
    />
  );
}
