import type { CellContext, ColumnDef, RowData } from '@tanstack/react-table';
import { DRAG_COLUMN_ID } from '../../core/grid.constants';
import { useDataGridContext } from '../../core/DataGridProvider';
import { DragHandle } from './DragHandle';

function DragCell<TData extends RowData>({ row }: CellContext<TData, unknown>) {
  const { labels } = useDataGridContext<TData>();
  if (row.getIsGrouped()) return null;
  return <DragHandle label={labels.dragRow} />;
}

export function createDragColumn<TData extends RowData>(): ColumnDef<TData, unknown> {
  return {
    id: DRAG_COLUMN_ID,
    header: () => null,
    cell: DragCell,
    size: 36,
    minSize: 36,
    maxSize: 36,
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
