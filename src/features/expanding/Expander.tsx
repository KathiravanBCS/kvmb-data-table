import { ActionIcon } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { Row, RowData } from '@tanstack/react-table';

export interface ExpanderProps<TData extends RowData> {
  row: Row<TData>;
  expandLabel: string;
  collapseLabel: string;
}

/** Chevron button that toggles a row (group, tree node or detail panel). */
export function Expander<TData extends RowData>({ row, expandLabel, collapseLabel }: ExpanderProps<TData>) {
  const expanded = row.getIsExpanded();
  return (
    <ActionIcon
      size="sm"
      variant="subtle"
      color="gray"
      tabIndex={-1}
      className="mdg-expander"
      data-dg-nav-passthrough=""
      data-dg-expander=""
      aria-label={expanded ? collapseLabel : expandLabel}
      aria-expanded={expanded}
      onClick={(e) => {
        e.stopPropagation();
        row.toggleExpanded();
      }}
    >
      {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
    </ActionIcon>
  );
}

/** A row opens a detail panel (rather than showing sub rows) when it has none. */
export function hasDetailToggle<TData extends RowData>(row: Row<TData>): boolean {
  return !row.getIsGrouped() && row.subRows.length === 0 && row.getCanExpand();
}
