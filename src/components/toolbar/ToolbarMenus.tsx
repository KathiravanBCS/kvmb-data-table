import { useState } from 'react';
import { ActionIcon, Button, Group, Menu, Text, Tooltip } from '@mantine/core';
import { RemovableChip } from './Chip';
import {
  IconCheck,
  IconChevronsDown,
  IconChevronsUp,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconLayoutRows,
} from '@tabler/icons-react';
import type { RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';
import type { GridDensity } from '../../core/grid.types';
import { exportToCsv } from '../../export/csv';
import { getColumnLabel } from '../../utils/columns';

export function DensityMenu<TData extends RowData>() {
  const { density, setDensity, labels } = useDataGridContext<TData>();
  const options: { value: GridDensity; label: string }[] = [
    { value: 'compact', label: labels.densityCompact },
    { value: 'standard', label: labels.densityStandard },
    { value: 'comfortable', label: labels.densityComfortable },
  ];
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={labels.density} withinPortal>
          <ActionIcon variant="default" size="md" aria-label={labels.density}>
            <IconLayoutRows size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{labels.density}</Menu.Label>
        {options.map((o) => (
          <Menu.Item
            key={o.value}
            onClick={() => setDensity(o.value)}
            // Mantine forces role="menuitem", so the current choice is exposed via aria-current.
            aria-current={density === o.value ? 'true' : undefined}
            leftSection={<IconCheck size={14} style={{ visibility: density === o.value ? 'visible' : 'hidden' }} aria-hidden />}
            fw={density === o.value ? 600 : undefined}
          >
            {o.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function ExportMenu<TData extends RowData>() {
  const { table, labels, api, props } = useDataGridContext<TData>();
  const [busy, setBusy] = useState(false);
  const selectedCount = Object.keys(table.getState().rowSelection).length;
  const filename = 'export';
  const excel = async (rows: 'filtered' | 'selected') => {
    setBusy(true);
    try {
      await api.exportExcel({ rows, filename });
    } catch (error) {
      if (props.onExportError) props.onExportError(error);
      else console.error(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} loading={busy} aria-label={busy ? labels.exporting : labels.export}>
          {labels.export}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconFileTypeCsv size={16} />} onClick={() => exportToCsv(table, { rows: 'filtered', filename })}>
          {labels.exportCsvFiltered}
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeCsv size={16} />} disabled={!selectedCount} onClick={() => exportToCsv(table, { rows: 'selected', filename })}>
          {labels.exportCsvSelected}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconFileSpreadsheet size={16} />} onClick={() => void excel('filtered')}>
          {labels.exportExcelFiltered}
        </Menu.Item>
        <Menu.Item leftSection={<IconFileSpreadsheet size={16} />} disabled={!selectedCount} onClick={() => void excel('selected')}>
          {labels.exportExcelSelected}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** Chips for the active grouping, with expand/collapse all. */
export function GroupingBar<TData extends RowData>() {
  const { table, labels } = useDataGridContext<TData>();
  const grouping = table.getState().grouping;
  if (!grouping.length) return null;
  return (
    <Group gap={6} className="mdg-grouping-bar" aria-label={labels.groupedBy}>
      <Text size="xs" className="mdg-muted">
        {labels.groupedBy}
      </Text>
      {grouping.map((id) => {
        const column = table.getColumn(id);
        const label = column ? getColumnLabel(column) : id;
        return (
          <RemovableChip key={id} removeLabel={`${labels.ungroup}: ${label}`} onRemove={() => column?.toggleGrouping()}>
            {label}
          </RemovableChip>
        );
      })}
      <Button color="gray" c="var(--mantine-color-text)" size="compact-xs" variant="subtle" leftSection={<IconChevronsDown size={12} />} onClick={() => table.toggleAllRowsExpanded(true)}>
        {labels.expandAll}
      </Button>
      <Button color="gray" c="var(--mantine-color-text)" size="compact-xs" variant="subtle" leftSection={<IconChevronsUp size={12} />} onClick={() => table.toggleAllRowsExpanded(false)}>
        {labels.collapseAll}
      </Button>
    </Group>
  );
}

/** Selection summary, "select all filtered" shortcut and consumer bulk actions. */
export function SelectionBar<TData extends RowData>() {
  const { table, labels, props, features, api } = useDataGridContext<TData>();
  const selection = table.getState().rowSelection;
  const count = Object.keys(selection).filter((k) => selection[k]).length;
  if (!count) return null;
  const filteredCount = table.getFilteredRowModel().flatRows.filter((r) => r.getCanSelect()).length;
  const pageAll = features.pagination && table.getIsAllPageRowsSelected();
  const allFiltered = table.getIsAllRowsSelected();
  const multi = props.selectionMode !== 'single';
  return (
    <Group gap="xs" className="mdg-selection-bar" role="status" aria-live="polite">
      <Text size="xs" fw={600}>
        {labels.selectedCount(count)}
      </Text>
      {multi && pageAll && !allFiltered && !props.manualPagination && filteredCount > count && (
        <Button color="gray" c="var(--mantine-color-text)" size="compact-xs" variant="subtle" onClick={() => table.toggleAllRowsSelected(true)}>
          {labels.selectAllFiltered(filteredCount)}
        </Button>
      )}
      {multi && allFiltered && filteredCount > 1 && (
        <Text size="xs" className="mdg-muted">
          {labels.allFilteredSelected(filteredCount)}
        </Text>
      )}
      <Button color="gray" c="var(--mantine-color-text)" size="compact-xs" variant="subtle" onClick={() => api.clearSelection()}>
        {labels.clearSelection}
      </Button>
      {props.renderBulkActions?.({
        selectedRows: api.getSelectedRows(),
        table,
        clearSelection: api.clearSelection,
      })}
    </Group>
  );
}
