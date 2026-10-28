import type { CellContext, ColumnDef, RowData } from '@tanstack/react-table';
import { EXPAND_COLUMN_ID } from '../../core/grid.constants';
import { useDataGridContext } from '../../core/DataGridProvider';
import { Expander, hasDetailToggle } from './Expander';

function ExpandHeader() {
  const { labels } = useDataGridContext();
  return <span className="mdg-sr-only">{labels.rowDetails}</span>;
}

function ExpandCell<TData extends RowData>({ row }: CellContext<TData, unknown>) {
  const { labels } = useDataGridContext<TData>();
  if (!hasDetailToggle(row)) return null;
  return <Expander row={row} expandLabel={labels.expandRow} collapseLabel={labels.collapseRow} />;
}

/** Internal column holding the detail-panel toggle (added when `renderDetailPanel` is set). */
export function createExpandColumn<TData extends RowData>(): ColumnDef<TData, unknown> {
  return {
    id: EXPAND_COLUMN_ID,
    header: ExpandHeader,
    cell: ExpandCell,
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    enableGrouping: false,
    enablePinning: false,
    meta: { align: 'center', exportable: false, editable: false, locked: true },
  };
}
