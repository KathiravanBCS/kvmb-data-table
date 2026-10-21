import { aggregationFns as tanstackAggregationFns, type AggregationFn } from '@tanstack/react-table';

/**
 * Aggregation functions usable as `columnDef.aggregationFn`.
 *
 * TanStack's built-ins can also be referenced by name: `'sum'`, `'mean'` (average),
 * `'min'`, `'max'`, `'count'`, `'uniqueCount'`, `'median'`, `'extent'`, `'unique'`.
 * Any `(columnId, leafRows, childRows) => value` function works as a custom aggregation.
 */
export const aggregationFns = {
  sum: tanstackAggregationFns.sum,
  avg: tanstackAggregationFns.mean,
  min: tanstackAggregationFns.min,
  max: tanstackAggregationFns.max,
  count: tanstackAggregationFns.count,
  uniqueCount: tanstackAggregationFns.uniqueCount,
  median: tanstackAggregationFns.median,
} satisfies Record<string, AggregationFn<unknown>>;
