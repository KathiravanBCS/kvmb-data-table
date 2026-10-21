import { Group, Loader, Pagination, Select, Text } from '@mantine/core';
import type { RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';

export interface GridPaginationProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Page navigation, page-size selector and "x–y of z" summary. Works for client and server pagination. */
export function GridPagination<TData extends RowData>({ className, style }: GridPaginationProps) {
  const { table, labels, pageSizeOptions, props } = useDataGridContext<TData>();
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = props.manualPagination ? (props.rowCount ?? table.getRowCount()) : table.getPrePaginationRowModel().rows.length;
  const pageCount = Math.max(1, table.getPageCount());
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  const sizes = pageSizeOptions.includes(pageSize) ? pageSizeOptions : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  return (
    <Group justify="space-between" gap="xs" wrap="wrap" className={className} style={style}>
      <Group gap="xs" wrap="nowrap">
        <Text size="xs" className="mdg-muted" component="span" aria-hidden>
          {labels.rowsPerPage}
        </Text>
        <Select
          size="xs"
          w={80}
          aria-label={labels.rowsPerPage}
          data={sizes.map(String)}
          value={String(pageSize)}
          allowDeselect={false}
          onChange={(v) => v && table.setPagination({ pageIndex: 0, pageSize: Number(v) })}
          comboboxProps={{ withinPortal: true }}
        />
        <Text size="xs" className="mdg-muted" aria-live="polite">
          {labels.pageInfo(from, to, total)}
        </Text>
        {props.loading && <Loader size="xs" aria-label={labels.loading} />}
      </Group>
      <Pagination
        size="sm"
        total={pageCount}
        value={pageIndex + 1}
        onChange={(page) => table.setPageIndex(page - 1)}
        withEdges
        siblings={1}
        disabled={props.loading && props.manualPagination}
        getControlProps={(control) => {
          const map = { first: labels.firstPage, previous: labels.previousPage, next: labels.nextPage, last: labels.lastPage } as const;
          return { 'aria-label': map[control] };
        }}
        getItemProps={(page) => ({ 'aria-label': `Page ${page}`, 'aria-current': page === pageIndex + 1 ? 'page' : undefined })}
      />
    </Group>
  );
}
