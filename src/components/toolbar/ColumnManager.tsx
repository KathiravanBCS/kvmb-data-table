import { useCallback, useState } from 'react';
import { ActionIcon, Button, Checkbox, Group, Popover, ScrollArea, Stack, Tooltip } from '@mantine/core';
import { IconColumns, IconPinned, IconPinnedOff } from '@tabler/icons-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Column, RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';
import { DragHandleContext } from '../../features/drag-drop/RowDragContext';
import { DragHandle } from '../../features/drag-drop/DragHandle';
import { getColumnLabel } from '../../utils/columns';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';

const MANAGER_CLASS = 'mdg-column-manager';

function ColumnItem<TData extends RowData>({ column, sortable }: { column: Column<TData, unknown>; sortable: boolean }) {
  const { labels, features } = useDataGridContext<TData>();
  const locked = !!column.columnDef.meta?.locked;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled: !sortable || locked,
  });
  const pinned = column.getIsPinned();
  return (
    <DragHandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef, disabled: !sortable || locked, isDragging }}>
      <Group
        ref={setNodeRef}
        gap={6}
        wrap="nowrap"
        justify="space-between"
        className="mdg-column-manager-item"
        data-dragging={isDragging || undefined}
        style={{ transform: CSS.Translate.toString(transform), transition }}
      >
        <Group gap={6} wrap="nowrap">
          {sortable && <DragHandle label={`${labels.dragColumn}: ${getColumnLabel(column)}`} size={14} />}
          <Checkbox
            size="xs"
            label={getColumnLabel(column)}
            checked={column.getIsVisible()}
            disabled={!column.getCanHide() || locked}
            onChange={column.getToggleVisibilityHandler()}
          />
        </Group>
        {features.pinning && column.getCanPin() && (
          <Tooltip label={pinned ? labels.unpin : labels.pinLeft} withinPortal>
            <ActionIcon
              size="sm"
              variant={pinned ? 'light' : 'subtle'}
              color="gray"
              aria-label={`${pinned ? labels.unpin : labels.pinLeft}: ${getColumnLabel(column)}`}
              aria-pressed={!!pinned}
              onClick={() => column.pin(pinned ? false : 'left')}
            >
              {pinned ? <IconPinnedOff size={14} /> : <IconPinned size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </DragHandleContext.Provider>
  );
}

/** Column visibility / order / pinning panel. */
export function ColumnManager<TData extends RowData>() {
  const { table, labels, features, isInternalColumn, api } = useDataGridContext<TData>();
  const [opened, setOpened] = useState(false);
  const close = useCallback(() => setOpened(false), []);
  useOutsideDismiss(opened, close, `.${MANAGER_CLASS}, [data-dg-columns-target]`);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const columns = table.getAllLeafColumns().filter((c) => !isInternalColumn(c.id));
  const ids = columns.map((c) => c.id);
  const sortable = features.ordering;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const order = table.getState().columnOrder.length ? table.getState().columnOrder : table.getAllLeafColumns().map((c) => c.id);
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from >= 0 && to >= 0) table.setColumnOrder(arrayMove(order, from, to));
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" withinPortal shadow="md" closeOnClickOutside={false} classNames={{ dropdown: MANAGER_CLASS }}>
      <Popover.Target>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconColumns size={14} />}
          onClick={() => setOpened((o) => !o)}
          aria-expanded={opened}
          aria-haspopup="dialog"
          data-dg-columns-target=""
        >
          {labels.columns}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="xs" role="dialog" aria-label={labels.columns}>
        <Stack gap={4} miw={240}>
          <Group gap={4} justify="space-between">
            <Button color="gray" c="var(--mantine-color-text)" size="compact-xs" variant="subtle" onClick={() => table.toggleAllColumnsVisible(true)}>
              {labels.showAllColumns}
            </Button>
            <Button color="gray" c="var(--mantine-color-text)"
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                for (const c of columns) if (c.getCanHide() && !c.columnDef.meta?.locked) c.toggleVisibility(false);
              }}
            >
              {labels.hideAllColumns}
            </Button>
            <Button color="gray" c="var(--mantine-color-text)" size="compact-xs" variant="subtle" onClick={() => api.resetColumnLayout()}>
              {labels.resetColumns}
            </Button>
          </Group>
          <ScrollArea.Autosize mah={360} type="auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <Stack gap={2}>
                  {columns.map((column) => (
                    <ColumnItem key={column.id} column={column} sortable={sortable} />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
