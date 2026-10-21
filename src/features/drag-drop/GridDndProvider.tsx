import { useMemo, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { RowData, Table } from '@tanstack/react-table';
import type { RowReorderEvent } from '../../core/grid.types';

export type DragItemType = 'row' | 'column';

export interface DragItemData {
  type: DragItemType;
}

/** Restricts row drags to the vertical axis and column drags to the horizontal axis. */
export const axisLockModifier: Modifier = ({ transform, active }) => {
  const type = (active?.data.current as DragItemData | undefined)?.type;
  if (type === 'row') return { ...transform, x: 0 };
  if (type === 'column') return { ...transform, y: 0 };
  return transform;
};

export interface GridDndProviderProps<TData extends RowData> {
  table: Table<TData>;
  data: TData[];
  onRowReorder?: (event: RowReorderEvent<TData>) => void;
  children: ReactNode;
}

export function GridDndProvider<TData extends RowData>({ table, data, onRowReorder, children }: GridDndProviderProps<TData>) {
  const sensors = useSensors(
    // A small distance avoids hijacking clicks on the handle.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const modifiers = useMemo(() => [axisLockModifier], []);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const type = (active.data.current as DragItemData | undefined)?.type;
    if (type === 'column') {
      const current = table.getState().columnOrder.length
        ? table.getState().columnOrder
        : table.getAllLeafColumns().map((c) => c.id);
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      if (from < 0 || to < 0) return;
      table.setColumnOrder(arrayMove(current, from, to));
      return;
    }
    if (type === 'row' && onRowReorder) {
      const activeRow = table.getRow(String(active.id), true);
      const overRow = table.getRow(String(over.id), true);
      if (!activeRow || !overRow) return;
      // Row indexes refer to positions in `data` (top-level rows) / the parent's sub rows.
      const sameLevel = activeRow.depth === 0 && overRow.depth === 0;
      const reorderedData = sameLevel ? arrayMove(data, activeRow.index, overRow.index) : [...data];
      onRowReorder({ rowId: activeRow.id, fromIndex: activeRow.index, toIndex: overRow.index, reorderedData });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={modifiers} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
