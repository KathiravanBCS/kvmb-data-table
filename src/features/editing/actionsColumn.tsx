import { ActionIcon, Group, Loader, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconPencil, IconX } from '@tabler/icons-react';
import type { CellContext, ColumnDef, RowData } from '@tanstack/react-table';
import { ACTIONS_COLUMN_ID } from '../../core/grid.constants';
import { useDataGridContext } from '../../core/DataGridProvider';

function ActionsHeader() {
  const { labels } = useDataGridContext();
  return <span className="mdg-sr-only">{labels.rowActions}</span>;
}

function ActionsCell<TData extends RowData>({ row, table }: CellContext<TData, unknown>) {
  const { editing, labels } = useDataGridContext<TData>();
  if (row.getIsGrouped()) return null;
  const isEditing = editing.active?.rowId === row.id;
  const save = editing.saveStates[row.id];
  const draft = editing.drafts[row.id];

  if (save?.status === 'saving') {
    return <Loader size="xs" aria-label={labels.saving} />;
  }
  if (isEditing) {
    return (
      <Group gap={4} wrap="nowrap" justify="center">
        <Tooltip label={labels.save} withinPortal>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="green"
            aria-label={labels.save}
            loading={draft?.validating}
            onClick={(e) => {
              e.stopPropagation();
              void editing.commit();
            }}
          >
            <IconCheck size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={labels.cancel} withinPortal>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={labels.cancel}
            onClick={(e) => {
              e.stopPropagation();
              editing.cancel();
            }}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }
  const canEdit = table.getVisibleLeafColumns().some((c) => editing.isCellEditable(row, c.id));
  return (
    <Group gap={4} wrap="nowrap" justify="center">
      {save?.status === 'error' && (
        <Tooltip label={`${labels.saveFailed}: ${save.error ?? ''}`} withinPortal>
          <ActionIcon size="sm" variant="subtle" color="red" aria-label={`${labels.saveFailed}: ${save.error ?? ''}`} onClick={() => editing.dismissSaveError(row.id)}>
            <IconAlertTriangle size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      {canEdit && (
        <Tooltip label={labels.edit} withinPortal>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label={labels.edit}
            onClick={(e) => {
              e.stopPropagation();
              editing.startEditing(row.id);
            }}
          >
            <IconPencil size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

export function createActionsColumn<TData extends RowData>(): ColumnDef<TData, unknown> {
  return {
    id: ACTIONS_COLUMN_ID,
    header: ActionsHeader,
    cell: ActionsCell,
    size: 84,
    minSize: 84,
    maxSize: 84,
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
