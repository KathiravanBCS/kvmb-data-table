import { Button, Group } from '@mantine/core';
import { RemovableChip } from './Chip';
import type { RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';
import { EMPTY_FILTER_MODEL, getActiveConditions, removeFilterNode } from '../../features/filtering/filter.model';
import { describeCondition } from '../filters/filterDescription';
import { getColumnLabel } from '../../utils/columns';

/** Removable chips for every active filter condition, plus "clear all". */
export function FilterChips<TData extends RowData>() {
  const { table, filterModel, setFilterModel, registry, labels } = useDataGridContext<TData>();
  const conditions = getActiveConditions(filterModel, registry);
  const search = (table.getState().globalFilter as string | undefined) ?? '';
  if (conditions.length === 0 && !search) return null;
  const nested = filterModel.children.some((c) => c.type === 'group');
  return (
    <Group gap={6} className="mdg-filter-chips">
      <Group gap={6} role="list" aria-label={labels.filters}>
        {search && (
          <div role="listitem">
            <RemovableChip removeLabel={`${labels.removeFilter}: “${search}”`} onRemove={() => table.setGlobalFilter('')}>
              “{search}”
            </RemovableChip>
          </div>
        )}
        {conditions.map((condition, index) => {
          const column = table.getColumn(condition.field);
          const text = describeCondition(condition, registry, column ? getColumnLabel(column) : condition.field);
          return (
            <Group key={condition.id} gap={6} role="listitem" wrap="nowrap">
              {index > 0 && !nested && <span className="mdg-filter-logic">{filterModel.logic.toUpperCase()}</span>}
              <RemovableChip
                removeLabel={`${labels.removeFilter}: ${text}`}
                onRemove={() => setFilterModel((prev) => removeFilterNode(prev, condition.id))}
              >
                {text}
              </RemovableChip>
            </Group>
          );
        })}
      </Group>
      <Button
        color="gray"
        c="var(--mantine-color-text)"
        size="compact-xs"
        variant="subtle"
        onClick={() => {
          setFilterModel(EMPTY_FILTER_MODEL);
          table.setGlobalFilter('');
        }}
      >
        {labels.clearFilters}
      </Button>
    </Group>
  );
}
