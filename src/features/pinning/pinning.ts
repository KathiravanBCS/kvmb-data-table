import type { CSSProperties } from 'react';

export type PinSide = 'left' | 'right' | false;

export interface ColumnLayoutItem {
  id: string;
  size: number;
  pinned: PinSide;
  /** Sticky offset from the left (left-pinned) or right (right-pinned) edge. */
  offset: number;
  /** Last left-pinned / first right-pinned column (draws the separator shadow). */
  edge: boolean;
}

/**
 * Computes sticky offsets for an ordered list of columns
 * (left-pinned first, then center, then right-pinned).
 */
export function computeColumnLayout(items: ReadonlyArray<{ id: string; size: number; pinned: PinSide }>): ColumnLayoutItem[] {
  const out: ColumnLayoutItem[] = items.map((c) => ({ ...c, offset: 0, edge: false }));
  let left = 0;
  let lastLeft = -1;
  out.forEach((c, i) => {
    if (c.pinned === 'left') {
      c.offset = left;
      left += c.size;
      lastLeft = i;
    }
  });
  let right = 0;
  let firstRight = -1;
  for (let i = out.length - 1; i >= 0; i--) {
    const c = out[i];
    if (c.pinned === 'right') {
      c.offset = right;
      right += c.size;
      firstRight = i;
    }
  }
  if (lastLeft >= 0) out[lastLeft].edge = true;
  if (firstRight >= 0) out[firstRight].edge = true;
  return out;
}

/** Inline style for a cell given its layout and the grid's layout mode. */
export function getCellLayoutStyle(item: ColumnLayoutItem, fill: boolean): CSSProperties {
  const grow = fill && !item.pinned ? item.size : 0;
  const style: CSSProperties = {
    width: item.size,
    minWidth: item.size,
    flex: `${grow} 0 ${item.size}px`,
  };
  if (item.pinned === 'left') style.left = item.offset;
  if (item.pinned === 'right') style.right = item.offset;
  return style;
}
