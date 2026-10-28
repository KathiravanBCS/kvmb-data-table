import type { CSSProperties } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { Header, HeaderGroup, RowData, Table } from '@tanstack/react-table';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import { HeaderCell } from './HeaderCell';

export interface GridHeaderProps<TData extends RowData> {
  table: Table<TData>;
  /** Leaf column layout (same as rows). */
  layout: ColumnLayoutItem[];
  fill: boolean;
  focusedCol: number;
  sortableColumns: boolean;
  classNames: { header: string; headerRow: string; headerCell: string };
  styles: { header?: CSSProperties; headerRow?: CSSProperties; headerCell?: CSSProperties };
  sticky: boolean;
}

function mergeHeaderGroups<TData extends RowData>(table: Table<TData>): Header<TData, unknown>[][] {
  const left = table.getLeftHeaderGroups();
  const center = table.getCenterHeaderGroups();
  const right = table.getRightHeaderGroups();
  return center.map((group: HeaderGroup<TData>, i) => [...(left[i]?.headers ?? []), ...group.headers, ...(right[i]?.headers ?? [])]);
}

interface Placement {
  /** Index of the first leaf column the header covers. */
  start: number;
  /** First header row the cell occupies (it spans down to its own row). */
  rowStart: number;
  layout: ColumnLayoutItem;
  style: CSSProperties;
  /** Divider flags for group headers (`data-divider-*`) and the last column. */
  dividerStart: boolean;
  dividerEnd: boolean;
  lastColumn: boolean;
}

/**
 * Multi-row headers are laid out on a CSS grid: column tracks mirror the body
 * columns, group headers span their children and columns without a group span
 * every header row (instead of leaving empty placeholder cells above them).
 */
function placeHeaders<TData extends RowData>(rows: Header<TData, unknown>[][], layout: ColumnLayoutItem[]): Map<string, Placement> {
  const topPlaceholderRow = new Map<string, number>();
  rows.forEach((headers, depth) => {
    for (const h of headers) if (h.isPlaceholder && !topPlaceholderRow.has(h.column.id)) topPlaceholderRow.set(h.column.id, depth);
  });
  const out = new Map<string, Placement>();
  rows.forEach((headers, depth) => {
    let start = 0;
    let previousGroupEnd = -1;
    for (const h of headers) {
      const first = layout[start];
      const last = layout[start + h.colSpan - 1];
      if (!h.isPlaceholder && first && last) {
        const rowStart = topPlaceholderRow.get(h.column.id) ?? depth;
        const size = layout.slice(start, start + h.colSpan).reduce((n, l) => n + l.size, 0);
        const pinned = first.pinned === 'left' ? 'left' : last.pinned === 'right' ? 'right' : false;
        const item: ColumnLayoutItem = {
          id: h.id,
          size,
          pinned,
          offset: pinned === 'left' ? first.offset : pinned === 'right' ? last.offset : 0,
          edge: pinned === 'left' ? last.edge : pinned === 'right' ? first.edge : false,
        };
        const style: CSSProperties = {
          gridColumn: `${start + 1} / span ${h.colSpan}`,
          gridRow: `${rowStart + 1} / ${depth + 2}`,
        };
        if (pinned === 'left') style.left = item.offset;
        if (pinned === 'right') style.right = item.offset;
        const group = h.subHeaders.length > 0;
        const end = start + h.colSpan;
        out.set(h.id, {
          start,
          rowStart,
          layout: item,
          style,
          dividerStart: group && start > 0 && previousGroupEnd !== start,
          dividerEnd: group && end < layout.length,
          lastColumn: end === layout.length,
        });
        if (group) previousGroupEnd = end;
      }
      start += h.colSpan;
    }
  });
  return out;
}

export function GridHeader<TData extends RowData>({
  table,
  layout,
  fill,
  focusedCol,
  sortableColumns,
  classNames,
  styles,
  sticky,
}: GridHeaderProps<TData>) {
  const rows = mergeHeaderGroups(table);
  const leafIndex = rows.length - 1;
  const centerIds = layout.filter((l) => !l.pinned).map((l) => l.id);

  if (rows.length > 1) {
    const placements = placeHeaders(rows, layout);
    // minmax(size, size·fr) grows columns in proportion to their size, like the body's flex rows.
    const template = layout.map((l) => (fill && !l.pinned ? `minmax(${l.size}px, ${l.size}fr)` : `${l.size}px`)).join(' ');
    return (
      <div
        role="rowgroup"
        className={classNames.header}
        style={{ ...styles.header, gridTemplateColumns: template }}
        data-sticky={sticky || undefined}
        data-grid=""
      >
        {rows.map((headers, depth) => {
          const isLeafRow = depth === leafIndex;
          return (
            <div
              key={depth}
              role="row"
              aria-rowindex={depth + 1}
              className={classNames.headerRow}
              style={styles.headerRow}
              data-leaf={isLeafRow || undefined}
            >
              {headers.map((header) => {
                const placement = placements.get(header.id);
                if (!placement) return null;
                return (
                  <HeaderCell
                    key={header.id}
                    header={header}
                    layout={placement.layout}
                    layoutStyle={placement.style}
                    dataAttributes={{
                      'data-divider-start': placement.dividerStart || undefined,
                      'data-divider-end': placement.dividerEnd || undefined,
                      'data-last-col': placement.lastColumn || undefined,
                    }}
                    rowSpan={depth - placement.rowStart + 1}
                    fill={fill}
                    isLeafRow={isLeafRow}
                    colIndex={placement.start}
                    focused={isLeafRow && focusedCol === placement.start}
                    sortableColumns={false}
                    className={classNames.headerCell}
                    style={styles.headerCell}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const headers = rows[0] ?? [];
  const cells = headers.map((header, i) => (
    <HeaderCell
      key={header.id}
      header={header}
      layout={layout[i]}
      fill={fill}
      isLeafRow
      colIndex={i}
      focused={focusedCol === i}
      sortableColumns={sortableColumns}
      className={classNames.headerCell}
      style={styles.headerCell}
    />
  ));
  return (
    <div role="rowgroup" className={classNames.header} style={styles.header} data-sticky={sticky || undefined}>
      <div role="row" aria-rowindex={1} className={classNames.headerRow} style={styles.headerRow} data-leaf>
        {sortableColumns ? (
          <SortableContext items={centerIds} strategy={horizontalListSortingStrategy}>
            {cells}
          </SortableContext>
        ) : (
          cells
        )}
      </div>
    </div>
  );
}
