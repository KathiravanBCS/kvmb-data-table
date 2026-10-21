import { useEffect, useLayoutEffect, type CSSProperties, type RefObject } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { Row, RowData } from '@tanstack/react-table';
import { GridRow, type GridRowProps, type RowHandlers } from '../rows/GridRow';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import type { GridEditing } from '../../features/editing/useGridEditing';
import type { DataGridLabels } from '../../core/grid.defaults';

export interface GridBodyProps<TData extends RowData> {
  rows: Row<TData>[];
  /** aria-rowindex of the first body row. */
  ariaRowOffset: number;
  layout: ColumnLayoutItem[];
  layoutKey: string;
  fill: boolean;
  focused: { row: number; col: number };
  striped: boolean;
  wrap: boolean;
  editing: GridEditing<TData>;
  editVersion: number;
  labels: DataGridLabels;
  handlers: RowHandlers<TData>;
  classNames: { body: string; row: string; cell: string; groupRow: string };
  styles: { body?: CSSProperties; row?: CSSProperties; cell?: CSSProperties };
  rowStyles: { row?: CSSProperties; cell?: CSSProperties };
  virtualize: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLDivElement | null>;
  rowHeight: number;
  dynamicRowHeight: boolean;
  overscan: number;
  sortableRows: boolean;
  dragDisabled: boolean;
  renderVersion: number;
  tree: boolean;
  /** Receives a function that scrolls a row index into view. */
  registerScrollToIndex: (fn: (index: number) => void) => void;
}

function useRowProps<TData extends RowData>(props: GridBodyProps<TData>) {
  const { editing } = props;
  return (row: Row<TData>, index: number, extra?: Partial<GridRowProps<TData>>): GridRowProps<TData> => {
    const isActive = editing.active?.rowId === row.id;
    return {
      row,
      rowIndex: index,
      ariaRowIndex: props.ariaRowOffset + index,
      layout: props.layout,
      layoutKey: props.layoutKey,
      fill: props.fill,
      selected: row.getIsSelected(),
      expanded: row.getIsExpanded(),
      focusedCol: props.focused.row === index ? props.focused.col : -1,
      striped: props.striped && index % 2 === 1,
      wrap: props.wrap,
      activeEditColumn: isActive ? editing.active!.columnId : undefined,
      editState: editing.drafts[row.id],
      saveState: editing.saveStates[row.id],
      editVersion: props.editVersion,
      editing,
      labels: props.labels,
      handlers: props.handlers,
      classNames: props.classNames,
      styles: props.rowStyles,
      sortable: props.sortableRows,
      dragDisabled: props.dragDisabled,
      renderVersion: props.renderVersion,
      tree: props.tree,
      ...extra,
    };
  };
}

function VirtualRows<TData extends RowData>(props: GridBodyProps<TData>) {
  const { rows, scrollRef, headerRef, rowHeight, overscan, dynamicRowHeight, registerScrollToIndex } = props;
  const virtualizer: Virtualizer<HTMLDivElement, Element> = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
    getItemKey: (index) => rows[index]?.id ?? index,
    scrollMargin: headerRef.current?.offsetHeight ?? 0,
    // jsdom has no layout: fall back to rendering an initial window.
    initialRect: { width: 1024, height: 600 },
  });

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  useEffect(() => {
    registerScrollToIndex((index) => virtualizer.scrollToIndex(index, { align: 'auto' }));
  }, [registerScrollToIndex, virtualizer]);

  const getProps = useRowProps(props);
  const items = virtualizer.getVirtualItems();
  const margin = virtualizer.options.scrollMargin;
  const paddingTop = items.length ? items[0].start - margin : 0;
  const paddingBottom = items.length ? virtualizer.getTotalSize() - (items[items.length - 1].end - margin) : 0;

  return (
    <>
      {paddingTop > 0 && <div aria-hidden style={{ height: paddingTop }} className="mdg-spacer" />}
      {items.map((item) => {
        const row = rows[item.index];
        if (!row) return null;
        return (
          <GridRow
            key={row.id}
            {...getProps(row, item.index, {
              dataIndex: item.index,
              measureRef: dynamicRowHeight ? virtualizer.measureElement : undefined,
            })}
          />
        );
      })}
      {paddingBottom > 0 && <div aria-hidden style={{ height: paddingBottom }} className="mdg-spacer" />}
    </>
  );
}

function PlainRows<TData extends RowData>(props: GridBodyProps<TData>) {
  const { registerScrollToIndex, scrollRef } = props;
  useEffect(() => {
    registerScrollToIndex((index) => {
      scrollRef.current
        ?.querySelector<HTMLElement>(`[role="rowgroup"] [data-row-index="${index}"]`)
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }, [registerScrollToIndex, scrollRef]);
  const getProps = useRowProps(props);
  return (
    <>
      {props.rows.map((row, index) => (
        <GridRow key={row.id} {...getProps(row, index)} />
      ))}
    </>
  );
}

export function GridBody<TData extends RowData>(props: GridBodyProps<TData>) {
  const content = props.virtualize ? <VirtualRows {...props} /> : <PlainRows {...props} />;
  return (
    <div role="rowgroup" className={props.classNames.body} style={props.styles.body}>
      {props.sortableRows ? (
        <SortableContext items={props.rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {content}
        </SortableContext>
      ) : (
        content
      )}
    </div>
  );
}
