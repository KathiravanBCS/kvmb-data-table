import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconBookmark, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import type { Column, RowData, Table } from '@tanstack/react-table';
import type { DataGridLabels } from '../../core/grid.defaults';
import type {
  FilterCondition,
  FilterGroup,
  FilterNode,
  FilterPreset,
} from '../../features/filtering/filter.types';
import {
  defaultOperatorByVariant,
  getOperatorsForVariant,
  type FilterOperatorRegistry,
} from '../../features/filtering/filter.operators';
import {
  addFilterNode,
  createFilterCondition,
  createFilterGroup,
  createFilterId,
  removeFilterNode,
  updateFilterNode,
} from '../../features/filtering/filter.model';
import { getColumnFilterOptions, getColumnFilterVariant } from '../../features/filtering/facets';
import { FilterValueInput } from './FilterValueInput';
import { FILTER_DROPDOWN_CLASS } from './ColumnFilterPanel';
import { getColumnLabel } from '../../utils/columns';

export interface FilterBuilderProps<TData extends RowData> {
  table: Table<TData>;
  value: FilterGroup;
  onChange: (model: FilterGroup) => void;
  registry: FilterOperatorRegistry;
  labels: DataGridLabels;
  /** Maximum nesting depth for groups. Default 3. */
  maxDepth?: number;
  /** Render dropdowns in portals. Set `false` inside a Popover. Default `true`. */
  withinPortal?: boolean;
}

export function getFilterableColumns<TData extends RowData>(table: Table<TData>): Column<TData, unknown>[] {
  return table
    .getAllLeafColumns()
    .filter((c) => !!c.accessorFn && c.columnDef.enableColumnFilter !== false && !c.id.startsWith('__dg_'));
}

interface NodeEditorProps<TData extends RowData> extends Omit<FilterBuilderProps<TData>, 'value' | 'onChange'> {
  root: FilterGroup;
  onRootChange: (model: FilterGroup) => void;
  columns: Column<TData, unknown>[];
}

function ConditionEditor<TData extends RowData>({
  condition,
  root,
  onRootChange,
  columns,
  table,
  registry,
  labels,
  withinPortal = true,
}: NodeEditorProps<TData> & { condition: FilterCondition }) {
  const column = columns.find((c) => c.id === condition.field);
  const variant = column ? getColumnFilterVariant(column) : 'text';
  const operators = getOperatorsForVariant(registry, variant);
  const def = registry.get(condition.operator);
  const options = useMemo(
    () => (column && (def?.input === 'select' || def?.input === 'multiSelect') ? getColumnFilterOptions(table, column) : []),
    [column, def?.input, table],
  );
  const update = (patch: Partial<FilterCondition>) =>
    onRootChange(updateFilterNode(root, condition.id, (n) => ({ ...(n as FilterCondition), ...patch })));

  return (
    <Group gap={6} wrap="nowrap" align="flex-start" className="mdg-filter-condition" data-testid="filter-condition">
      <Select
        size="xs"
        w={150}
        aria-label={labels.filterField}
        data={columns.map((c) => ({ value: c.id, label: getColumnLabel(c) }))}
        value={condition.field}
        allowDeselect={false}
        searchable
        comboboxProps={{ withinPortal, classNames: { dropdown: FILTER_DROPDOWN_CLASS } }}
        onChange={(field) => {
          if (!field) return;
          const nextColumn = columns.find((c) => c.id === field);
          const nextVariant = nextColumn ? getColumnFilterVariant(nextColumn) : 'text';
          const sameVariant = nextVariant === variant;
          update({
            field,
            operator: sameVariant ? condition.operator : defaultOperatorByVariant[nextVariant],
            value: sameVariant ? condition.value : undefined,
          });
        }}
      />
      <Select
        size="xs"
        w={140}
        aria-label={labels.filterOperator}
        data={operators.map((o) => ({ value: o.operator, label: o.label }))}
        value={condition.operator}
        allowDeselect={false}
        comboboxProps={{ withinPortal, classNames: { dropdown: FILTER_DROPDOWN_CLASS } }}
        onChange={(operator) => {
          if (!operator) return;
          const keep = registry.get(operator)?.input === def?.input;
          update({ operator, value: keep ? condition.value : undefined });
        }}
      />
      <Box style={{ flex: 1, minWidth: 160 }}>
        <FilterValueInput
          kind={def?.input ?? 'text'}
          value={condition.value}
          options={options}
          label={labels.filterValue}
          minLabel={labels.valueMin}
          maxLabel={labels.valueMax}
          dropdownClassName={FILTER_DROPDOWN_CLASS}
          withinPortal={withinPortal}
          onChange={(value) => update({ value })}
        />
      </Box>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        aria-label={labels.removeFilter}
        onClick={() => onRootChange(removeFilterNode(root, condition.id))}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}

function GroupEditor<TData extends RowData>(props: NodeEditorProps<TData> & { group: FilterGroup; depth: number }) {
  const { group, root, onRootChange, columns, labels, depth, maxDepth = 3 } = props;
  const firstColumn = columns[0];
  const addCondition = () => {
    if (!firstColumn) return;
    const variant = getColumnFilterVariant(firstColumn);
    onRootChange(addFilterNode(root, group.id, createFilterCondition(firstColumn.id, defaultOperatorByVariant[variant])));
  };
  const addGroup = () => {
    if (!firstColumn) return;
    const variant = getColumnFilterVariant(firstColumn);
    const child = createFilterGroup(group.logic === 'and' ? 'or' : 'and', [
      createFilterCondition(firstColumn.id, defaultOperatorByVariant[variant]),
    ]);
    onRootChange(addFilterNode(root, group.id, child));
  };
  return (
    <Stack gap={6} className="mdg-filter-group" data-depth={depth} role="group" aria-label={group.logic === 'and' ? labels.filterMatchAll : labels.filterMatchAny}>
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <SegmentedControl
          size="xs"
          value={group.logic}
          data={[
            { value: 'and', label: labels.filterMatchAll },
            { value: 'or', label: labels.filterMatchAny },
          ]}
          onChange={(logic) => onRootChange(updateFilterNode(root, group.id, (n) => ({ ...(n as FilterGroup), logic: logic as FilterGroup['logic'] })))}
        />
        {depth > 0 && (
          <ActionIcon variant="subtle" color="gray" aria-label={labels.removeFilter} onClick={() => onRootChange(removeFilterNode(root, group.id))}>
            <IconTrash size={14} />
          </ActionIcon>
        )}
      </Group>
      {group.children.map((child: FilterNode) =>
        child.type === 'condition' ? (
          <ConditionEditor key={child.id} {...props} condition={child} />
        ) : (
          <Box key={child.id} className="mdg-filter-subgroup">
            <GroupEditor {...props} group={child} depth={depth + 1} />
          </Box>
        ),
      )}
      <Group gap="xs">
        <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} onClick={addCondition} disabled={!firstColumn}>
          {labels.addFilter}
        </Button>
        {depth + 1 < maxDepth && (
          <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={addGroup} disabled={!firstColumn}>
            {labels.addGroup}
          </Button>
        )}
      </Group>
    </Stack>
  );
}

/**
 * Visual AND/OR filter builder bound to a {@link FilterGroup}. Fully controlled:
 * every edit calls `onChange` with a new immutable model.
 */
export function FilterBuilder<TData extends RowData>({ table, value, onChange, registry, labels, maxDepth, withinPortal = true }: FilterBuilderProps<TData>) {
  const columns = getFilterableColumns(table);
  return (
    <GroupEditor
      table={table}
      registry={registry}
      labels={labels}
      maxDepth={maxDepth}
      withinPortal={withinPortal}
      root={value}
      onRootChange={onChange}
      columns={columns}
      group={value}
      depth={0}
    />
  );
}

export interface FilterPresetsMenuProps {
  presets: FilterPreset[];
  current: FilterGroup;
  onApply: (preset: FilterPreset) => void;
  onChange: (presets: FilterPreset[]) => void;
  labels: DataGridLabels;
  withinPortal?: boolean;
}

export function FilterPresetsMenu({ presets, current, onApply, onChange, labels, withinPortal = true }: FilterPresetsMenuProps) {
  const [name, setName] = useState('');
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = presets.find((p) => p.name === trimmed);
    const preset: FilterPreset = { id: existing?.id ?? createFilterId('p'), name: trimmed, model: current };
    onChange(existing ? presets.map((p) => (p.id === existing.id ? preset : p)) : [...presets, preset]);
    setName('');
  };
  return (
    <Menu position="bottom-start" withinPortal={withinPortal} closeOnItemClick={false} classNames={{ dropdown: FILTER_DROPDOWN_CLASS }}>
      <Menu.Target>
        <Button size="compact-xs" variant="subtle" leftSection={<IconBookmark size={12} />}>
          {labels.filterPresets}
        </Button>
      </Menu.Target>
      <Menu.Dropdown miw={240}>
        {presets.length === 0 && (
          <Text size="xs" c="dimmed" px="sm" py={6}>
            {labels.noPresets}
          </Text>
        )}
        {presets.map((preset) => (
          <Menu.Item
            key={preset.id}
            onClick={() => onApply(preset)}
            rightSection={
              <ActionIcon
                component="span"
                size="xs"
                variant="subtle"
                color="red"
                aria-label={`${labels.deletePreset}: ${preset.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(presets.filter((p) => p.id !== preset.id));
                }}
              >
                <IconTrash size={12} />
              </ActionIcon>
            }
          >
            {preset.name}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Group gap={4} p={6} wrap="nowrap">
          <TextInput
            size="xs"
            placeholder={labels.presetNamePlaceholder}
            aria-label={labels.presetNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') save();
            }}
          />
          <Button size="xs" onClick={save} disabled={!name.trim()}>
            {labels.save}
          </Button>
        </Group>
      </Menu.Dropdown>
    </Menu>
  );
}
