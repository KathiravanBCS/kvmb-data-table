import { Checkbox, Radio } from '@mantine/core';
import type { ColumnDef, HeaderContext, CellContext, RowData } from '@tanstack/react-table';
import { SELECT_COLUMN_ID } from '../../core/grid.constants';
import { useDataGridContext } from '../../core/DataGridProvider';

function SelectAllHeader<TData extends RowData>({ table }: HeaderContext<TData, unknown>) {
  const { labels, features } = useDataGridContext<TData>();
  // With pagination the header toggles the current page; otherwise every filtered row.
  const pageMode = features.pagination;
  const checked = pageMode ? table.getIsAllPageRowsSelected() : table.getIsAllRowsSelected();
  const indeterminate = !checked && (pageMode ? table.getIsSomePageRowsSelected() : table.getIsSomeRowsSelected());
  return (
    <Checkbox
      size="xs"
      aria-label={labels.selectAllOnPage}
      checked={checked}
      indeterminate={indeterminate}
      tabIndex={-1}
      data-dg-nav-passthrough=""
      onChange={() => (pageMode ? table.toggleAllPageRowsSelected(!checked) : table.toggleAllRowsSelected(!checked))}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function SingleSelectHeader() {
  const { labels } = useDataGridContext();
  return <span className="mdg-sr-only">{labels.selectRow}</span>;
}

function SelectCell<TData extends RowData>({ row }: CellContext<TData, unknown>) {
  const { labels, props } = useDataGridContext<TData>();
  const single = props.selectionMode === 'single';
  const common = {
    size: 'xs' as const,
    'aria-label': labels.selectRow,
    checked: row.getIsSelected(),
    disabled: !row.getCanSelect(),
    tabIndex: -1,
    'data-dg-nav-passthrough': '',
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };
  if (single) {
    return <Radio {...common} onChange={() => row.toggleSelected(true)} />;
  }
  return <Checkbox {...common} indeterminate={!row.getIsSelected() && row.getIsSomeSelected()} onChange={row.getToggleSelectedHandler()} />;
}

export function createSelectColumn<TData extends RowData>(mode: 'single' | 'multiple'): ColumnDef<TData, unknown> {
  return {
    id: SELECT_COLUMN_ID,
    header: mode === 'multiple' ? SelectAllHeader : SingleSelectHeader,
    cell: SelectCell,
    size: 44,
    minSize: 44,
    maxSize: 44,
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
