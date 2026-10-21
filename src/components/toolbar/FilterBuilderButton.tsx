import { useCallback, useState } from 'react';
import { Badge, Button, Divider, Group, Popover, ScrollArea } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import type { RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';
import { FilterBuilder, FilterPresetsMenu } from '../filters/FilterBuilder';
import { EMPTY_FILTER_MODEL, createFilterGroup } from '../../features/filtering/filter.model';
import type { FilterGroup } from '../../features/filtering/filter.types';
import { FILTER_DROPDOWN_CLASS } from '../filters/ColumnFilterPanel';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';

/** Toolbar button opening the advanced filter builder (edits a draft until "Apply"). */
export function FilterBuilderButton<TData extends RowData>() {
  const { table, filterModel, setFilterModel, registry, labels, activeFilterCount, presets, setPresets } = useDataGridContext<TData>();
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState<FilterGroup>(filterModel);
  const close = useCallback(() => setOpened(false), []);
  useOutsideDismiss(opened, close, `.${FILTER_DROPDOWN_CLASS}, [data-dg-filter-target]`);

  const open = () => {
    // Work on a copy with a real id so nested edits don't target the frozen empty model.
    setDraft(filterModel.children.length ? filterModel : { ...createFilterGroup(filterModel.logic), id: filterModel.id });
    setOpened(true);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      withinPortal
      shadow="md"
      trapFocus
      closeOnEscape
      closeOnClickOutside={false}
      classNames={{ dropdown: FILTER_DROPDOWN_CLASS }}
    >
      <Popover.Target>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconFilter size={14} />}
          rightSection={activeFilterCount ? <Badge size="xs" circle>{activeFilterCount}</Badge> : null}
          onClick={() => (opened ? setOpened(false) : open())}
          data-dg-filter-target=""
          aria-haspopup="dialog"
          aria-expanded={opened}
        >
          {labels.filters}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="sm" maw="min(720px, calc(100vw - 32px))" aria-label={labels.filters} role="dialog">
        <ScrollArea.Autosize mah={420} type="auto" offsetScrollbars>
          <FilterBuilder table={table} value={draft} onChange={setDraft} registry={registry} labels={labels} />
        </ScrollArea.Autosize>
        <Divider my="xs" />
        <Group justify="space-between" gap="xs">
          <FilterPresetsMenu
            presets={presets}
            current={draft}
            labels={labels}
            onChange={setPresets}
            onApply={(preset) => {
              setDraft(preset.model);
              setFilterModel(preset.model);
            }}
          />
          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                setDraft({ ...EMPTY_FILTER_MODEL, children: [] });
                setFilterModel(EMPTY_FILTER_MODEL);
              }}
            >
              {labels.clearFilters}
            </Button>
            <Button
              size="xs"
              onClick={() => {
                setFilterModel(draft);
                setOpened(false);
              }}
            >
              {labels.apply}
            </Button>
          </Group>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
