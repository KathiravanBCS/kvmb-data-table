import type { CSSProperties } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { Header, HeaderGroup, RowData, Table } from '@tanstack/react-table';
import { computeColumnLayout, type ColumnLayoutItem } from '../../features/pinning/pinning';
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

  return (
    <div role="rowgroup" className={classNames.header} style={styles.header} data-sticky={sticky || undefined}>
      {rows.map((headers, depth) => {
        const isLeafRow = depth === leafIndex;
        // Group header rows compute their own layout from header sizes (colSpan aware).
        const rowLayout = isLeafRow
          ? layout
          : computeColumnLayout(headers.map((h) => ({ id: h.id, size: h.getSize(), pinned: h.column.getIsPinned() })));
        const cells = headers.map((header, i) => (
          <HeaderCell
            key={header.id}
            header={header}
            layout={rowLayout[i]}
            fill={fill}
            isLeafRow={isLeafRow}
            colIndex={isLeafRow ? i : headers.slice(0, i).reduce((n, h) => n + h.colSpan, 0)}
            focused={isLeafRow && focusedCol === i}
            sortableColumns={isLeafRow && sortableColumns}
            className={classNames.headerCell}
            style={styles.headerCell}
          />
        ));
        return (
          <div
            key={depth}
            role="row"
            aria-rowindex={depth + 1}
            className={classNames.headerRow}
            style={styles.headerRow}
            data-leaf={isLeafRow || undefined}
          >
            {isLeafRow && sortableColumns ? (
              <SortableContext items={centerIds} strategy={horizontalListSortingStrategy}>
                {cells}
              </SortableContext>
            ) : (
              cells
            )}
          </div>
        );
      })}
    </div>
  );
}
