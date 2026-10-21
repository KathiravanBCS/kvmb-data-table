import { Group } from '@mantine/core';
import type { RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';
import { GlobalSearch } from './GlobalSearch';
import { FilterBuilderButton } from './FilterBuilderButton';
import { ColumnManager } from './ColumnManager';
import { DensityMenu, ExportMenu, GroupingBar, SelectionBar } from './ToolbarMenus';
import { FilterChips } from './FilterChips';

export interface DataGridToolbarProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Default toolbar. Replace it entirely with the `renderToolbar` prop. */
export function DataGridToolbar<TData extends RowData>({ className, style }: DataGridToolbarProps) {
  const { features, props, table } = useDataGridContext<TData>();
  if (props.renderToolbar) {
    return (
      <div className={className} style={style}>
        {props.renderToolbar(table)}
      </div>
    );
  }
  return (
    <div className={className} style={style} role="toolbar" aria-label={props['aria-label'] ? `${props['aria-label']} toolbar` : 'Grid toolbar'}>
      <Group justify="space-between" gap="xs" wrap="wrap">
        <Group gap="xs" wrap="wrap">
          {features.globalFilter && <GlobalSearch<TData> />}
          {features.filterBuilder && <FilterBuilderButton<TData> />}
        </Group>
        <Group gap="xs" wrap="wrap">
          {props.toolbarActions}
          {features.export && <ExportMenu<TData> />}
          {features.densityToggle && <DensityMenu<TData> />}
          {features.hiding && <ColumnManager<TData> />}
        </Group>
      </Group>
      <FilterChips<TData> />
      <GroupingBar<TData> />
      {features.selection && <SelectionBar<TData> />}
    </div>
  );
}
