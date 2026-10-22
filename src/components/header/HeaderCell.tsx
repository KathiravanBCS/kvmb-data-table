import { useCallback, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ActionIcon, Menu, Popover } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDotsVertical,
  IconEyeOff,
  IconFilter,
  IconFilterFilled,
  IconLayoutList,
  IconPinned,
  IconPinnedOff,
  IconX,
} from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender, type Header, type RowData } from '@tanstack/react-table';
import clsx from 'clsx';
import { useDataGridContext } from '../../core/DataGridProvider';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import { getCellLayoutStyle } from '../../features/pinning/pinning';
import { getColumnAlign, getColumnLabel } from '../../utils/columns';
import { ColumnFilterPanel, FILTER_DROPDOWN_CLASS } from '../filters/ColumnFilterPanel';
import { flattenConditions } from '../../features/filtering/filter.model';
import { DragHandleContext } from '../../features/drag-drop/RowDragContext';
import { DragHandle } from '../../features/drag-drop/DragHandle';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';

export interface HeaderCellProps<TData extends RowData> {
  header: Header<TData, unknown>;
  layout: ColumnLayoutItem;
  fill: boolean;
  /** Leaf header row (navigable) vs. group header row. */
  isLeafRow: boolean;
  colIndex: number;
  focused: boolean;
  sortableColumns: boolean;
  className: string;
  style?: CSSProperties;
}

const RESIZE_STEP = 10;

function SortIcon({ direction, index }: { direction: false | 'asc' | 'desc'; index: number }) {
  if (!direction) return <IconArrowsSort size={14} className="mdg-sort-icon mdg-sort-icon-idle" aria-hidden />;
  return (
    <span className="mdg-sort-icon" aria-hidden>
      {direction === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
      {index > 0 && <sup className="mdg-sort-index">{index}</sup>}
    </span>
  );
}

export function HeaderCell<TData extends RowData>(props: HeaderCellProps<TData>) {
  const { header, layout, fill, isLeafRow, colIndex, focused, className, style } = props;
  const { column } = header;
  const ctx = useDataGridContext<TData>();
  const { labels, features, filterModel, table, isInternalColumn } = ctx;
  const [menuOpened, setMenuOpened] = useState(false);
  const [filterOpened, setFilterOpened] = useState(false);
  const closeFilter = useCallback(() => setFilterOpened(false), []);
  useOutsideDismiss(filterOpened, closeFilter, `.${FILTER_DROPDOWN_CLASS}, [data-dg-filter-button="${column.id}"]`);

  const internal = isInternalColumn(column.id);
  const isLeaf = isLeafRow && !header.isPlaceholder && header.subHeaders.length === 0;
  const sortable = isLeaf && column.getCanSort();
  const sorted = column.getIsSorted();
  const sortIndex = table.getState().sorting.length > 1 ? column.getSortIndex() + 1 : 0;
  const canFilter = isLeaf && features.filtering && !!column.accessorFn && column.columnDef.enableColumnFilter !== false && !internal;
  const filtered = canFilter && flattenConditions(filterModel).some((c) => c.field === column.id);
  const canPin = isLeaf && features.pinning && column.getCanPin() && !internal;
  const canGroup = isLeaf && features.grouping && column.getCanGroup() && !internal;
  const canHide = isLeaf && features.hiding && column.getCanHide() && !column.columnDef.meta?.locked && !internal;
  const showMenu = isLeaf && !internal && (sortable || canPin || canGroup || canHide);
  const label = getColumnLabel(column);

  const draggable = props.sortableColumns && isLeaf && !internal && !layout.pinned && !column.columnDef.meta?.locked;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
    disabled: !draggable,
  });

  const toggleSort = (multi: boolean) => {
    if (!sortable) return;
    const next = column.getNextSortingOrder();
    // Without an explicit direction TanStack cycles asc → desc → none.
    column.toggleSorting(undefined, multi && column.getCanMultiSort());
    ctx.announce(
      next === 'asc' ? labels.sortedAscending(label) : next === 'desc' ? labels.sortedDescending(label) : labels.sortCleared(label),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if ((event.key === 'Enter' || event.key === ' ') && sortable) {
      event.preventDefault();
      event.stopPropagation();
      toggleSort(event.shiftKey);
    } else if (event.key === 'ArrowDown' && event.altKey && showMenu) {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpened(true);
    } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && event.altKey && column.getCanResize()) {
      // Alt+Arrow resizes the column from the keyboard.
      event.preventDefault();
      event.stopPropagation();
      const delta = event.key === 'ArrowLeft' ? -RESIZE_STEP : RESIZE_STEP;
      const { minSize = 20, maxSize = Number.MAX_SAFE_INTEGER } = column.columnDef;
      const size = Math.min(maxSize, Math.max(minSize, column.getSize() + delta));
      table.setColumnSizing((prev) => ({ ...prev, [column.id]: size }));
    }
  };

  const ariaSort = sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : sortable ? 'none' : undefined;
  const align = getColumnAlign(column);
  const dragStyle: CSSProperties = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 5 : undefined };

  const content = (
    <div
      ref={setNodeRef}
      role="columnheader"
      aria-colindex={isLeaf || header.colSpan === 1 ? colIndex + 1 : undefined}
      aria-colspan={header.colSpan > 1 ? header.colSpan : undefined}
      aria-sort={ariaSort}
      tabIndex={isLeafRow ? (focused ? 0 : -1) : undefined}
      data-row-index={isLeafRow ? -1 : undefined}
      data-col-index={isLeafRow ? colIndex : undefined}
      data-column-id={column.id}
      data-align={align}
      data-sortable={sortable || undefined}
      data-sorted={sorted || undefined}
      data-filtered={filtered || undefined}
      data-pinned={layout.pinned || undefined}
      data-pinned-edge={layout.edge ? layout.pinned : undefined}
      data-dragging={isDragging || undefined}
      data-placeholder={header.isPlaceholder || undefined}
      className={clsx(className, column.columnDef.meta?.headerClassName)}
      style={{ ...getCellLayoutStyle(layout, fill), ...style, ...dragStyle }}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, [role="menu"], .mdg-resizer')) return;
        toggleSort(e.shiftKey || e.metaKey || e.ctrlKey);
      }}
    >
      {draggable && <DragHandle label={`${labels.dragColumn}: ${label}`} size={12} className="mdg-drag-handle mdg-header-drag-handle" />}
      <div className="mdg-header-content">
        <span className="mdg-header-label">{header.isPlaceholder ? null : flexRender(column.columnDef.header, header.getContext())}</span>
        {sortable && <SortIcon direction={sorted} index={sortIndex} />}
      </div>
      {(canFilter || showMenu) && (
        <div className="mdg-header-actions">
          {canFilter && (
            <Popover
              opened={filterOpened}
              onChange={setFilterOpened}
              position="bottom-end"
              withinPortal
              shadow="md"
              trapFocus
              closeOnClickOutside={false}
              classNames={{ dropdown: FILTER_DROPDOWN_CLASS }}
            >
              <Popover.Target>
                <ActionIcon
                  size="sm"
                  variant={filtered ? 'light' : 'subtle'}
                  color={filtered ? undefined : 'gray'}
                  className="mdg-header-button"
                  data-active={filtered || undefined}
                  data-dg-filter-button={column.id}
                  tabIndex={-1}
                  aria-label={`${labels.filterColumn}: ${label}`}
                  aria-expanded={filterOpened}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterOpened((o) => !o);
                  }}
                >
                  {filtered ? <IconFilterFilled size={14} /> : <IconFilter size={14} />}
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown p="xs" role="dialog" aria-label={`${labels.filterColumn}: ${label}`} onKeyDown={(e) => e.stopPropagation()}>
                {filterOpened && <ColumnFilterPanel column={column} />}
              </Popover.Dropdown>
            </Popover>
          )}
          {showMenu && (
            <Menu opened={menuOpened} onChange={setMenuOpened} position="bottom-end" withinPortal shadow="md">
              <Menu.Target>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  className="mdg-header-button"
                  tabIndex={-1}
                  aria-label={`${labels.columnActions}: ${label}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onKeyDown={(e) => e.stopPropagation()}>
                {sortable && (
                  <>
                    <Menu.Item
                      leftSection={<IconArrowUp size={14} />}
                      onClick={() => {
                        column.toggleSorting(false, false);
                        ctx.announce(labels.sortedAscending(label));
                      }}
                    >
                      {labels.sortAscending}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconArrowDown size={14} />}
                      onClick={() => {
                        column.toggleSorting(true, false);
                        ctx.announce(labels.sortedDescending(label));
                      }}
                    >
                      {labels.sortDescending}
                    </Menu.Item>
                    {sorted && (
                      <Menu.Item
                        leftSection={<IconX size={14} />}
                        onClick={() => {
                          column.clearSorting();
                          ctx.announce(labels.sortCleared(label));
                        }}
                      >
                        {labels.clearSort}
                      </Menu.Item>
                    )}
                  </>
                )}
                {canPin && (
                  <>
                    <Menu.Divider />
                    {column.getIsPinned() !== 'left' && (
                      <Menu.Item leftSection={<IconPinned size={14} />} onClick={() => column.pin('left')}>
                        {labels.pinLeft}
                      </Menu.Item>
                    )}
                    {column.getIsPinned() !== 'right' && (
                      <Menu.Item leftSection={<IconPinned size={14} />} onClick={() => column.pin('right')}>
                        {labels.pinRight}
                      </Menu.Item>
                    )}
                    {column.getIsPinned() && (
                      <Menu.Item leftSection={<IconPinnedOff size={14} />} onClick={() => column.pin(false)}>
                        {labels.unpin}
                      </Menu.Item>
                    )}
                  </>
                )}
                {canGroup && (
                  <>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconLayoutList size={14} />} onClick={() => column.toggleGrouping()}>
                      {column.getIsGrouped() ? labels.ungroup : labels.groupBy}
                    </Menu.Item>
                  </>
                )}
                {canHide && (
                  <>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconEyeOff size={14} />} onClick={() => column.toggleVisibility(false)}>
                      {labels.hideColumn}
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </div>
      )}
      {isLeaf && column.getCanResize() && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`${labels.resizeColumn}: ${label}`}
          aria-valuenow={column.getSize()}
          aria-valuemin={column.columnDef.minSize}
          aria-valuemax={column.columnDef.maxSize}
          className="mdg-resizer"
          data-resizing={column.getIsResizing() || undefined}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            column.resetSize();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );

  return (
    <DragHandleContext.Provider value={draggable ? { attributes, listeners, setActivatorNodeRef, disabled: false, isDragging } : null}>
      {content}
    </DragHandleContext.Provider>
  );
}
