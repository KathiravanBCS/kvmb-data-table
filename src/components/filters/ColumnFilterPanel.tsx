import { useMemo, useState } from 'react';
import { Button, Select, Stack } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import type { Column, RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';
import type { FilterOperator, FilterValue } from '../../features/filtering/filter.types';
import { defaultOperatorByVariant, getOperatorsForVariant } from '../../features/filtering/filter.operators';
import { getColumnQuickFilter, removeConditionsForField, setColumnQuickFilter } from '../../features/filtering/filter.model';
import { getColumnFilterOptions, getColumnFilterVariant } from '../../features/filtering/facets';
import { FilterValueInput } from './FilterValueInput';
import { getColumnLabel } from '../../utils/columns';

export const FILTER_DROPDOWN_CLASS = 'mdg-filter-dropdown';

export interface ColumnFilterPanelProps<TData extends RowData> {
  column: Column<TData, unknown>;
}

/** Quick filter for a single column (operator + value), shown from the column menu. */
export function ColumnFilterPanel<TData extends RowData>({ column }: ColumnFilterPanelProps<TData>) {
  const { table, filterModel, setFilterModel, registry, labels } = useDataGridContext<TData>();
  const variant = getColumnFilterVariant(column);
  const operators = useMemo(() => getOperatorsForVariant(registry, variant), [registry, variant]);
  const existing = getColumnQuickFilter(filterModel, column.id);
  const [operator, setOperator] = useState<FilterOperator>(existing?.operator ?? defaultOperatorByVariant[variant]);
  const [value, setValue] = useState<FilterValue | undefined>(existing?.value);
  const def = registry.get(operator);
  const options = useMemo(
    () => (def?.input === 'select' || def?.input === 'multiSelect' ? getColumnFilterOptions(table, column) : []),
    [def?.input, table, column],
  );

  const apply = (op: FilterOperator, v: FilterValue | undefined) => setFilterModel((prev) => setColumnQuickFilter(prev, column.id, op, v));
  const applyDebounced = useDebouncedCallback(apply, 300);
  const label = getColumnLabel(column);

  return (
    <Stack gap="xs" p={4} miw={220} className="mdg-column-filter">
      <Select
        size="xs"
        aria-label={`${labels.filterOperator} – ${label}`}
        data={operators.map((o) => ({ value: o.operator, label: o.label }))}
        value={operator}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true, classNames: { dropdown: FILTER_DROPDOWN_CLASS } }}
        onChange={(next) => {
          if (!next) return;
          setOperator(next);
          const nextDef = registry.get(next);
          // Keep the value only when the new operator uses the same input kind.
          const keep = nextDef?.input === def?.input;
          const nextValue = keep ? value : undefined;
          setValue(nextValue);
          apply(next, nextValue);
        }}
      />
      <FilterValueInput
        kind={def?.input ?? 'text'}
        value={value}
        options={options}
        label={`${labels.filterValue} – ${label}`}
        minLabel={labels.valueMin}
        maxLabel={labels.valueMax}
        autoFocus
        dropdownClassName={FILTER_DROPDOWN_CLASS}
        onChange={(v) => {
          setValue(v);
          if (def?.input === 'text' || def?.input === 'number' || def?.input === 'numberRange') applyDebounced(operator, v);
          else apply(operator, v);
        }}
      />
      <Button
        size="compact-xs"
        variant="subtle"
        color="gray"
        disabled={!existing}
        onClick={() => {
          setValue(undefined);
          setFilterModel((prev) => removeConditionsForField(prev, column.id));
        }}
      >
        {labels.clearColumnFilter}
      </Button>
    </Stack>
  );
}
