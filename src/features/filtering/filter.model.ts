import type {
  FilterCondition,
  FilterGroup,
  FilterLogic,
  FilterNode,
  FilterOperator,
  FilterValue,
} from './filter.types';
import { isEmptyValue, operatorNeedsValue, type FilterOperatorRegistry } from './filter.operators';

let idCounter = 0;

/** Generates a model-unique id. Not cryptographically random; only needs uniqueness within a model. */
export function createFilterId(prefix = 'f'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function createFilterGroup(logic: FilterLogic = 'and', children: FilterNode[] = []): FilterGroup {
  return { type: 'group', id: createFilterId('g'), logic, children };
}

export function createFilterCondition(
  field: string,
  operator: FilterOperator,
  value?: FilterValue,
): FilterCondition {
  return { type: 'condition', id: createFilterId('c'), field, operator, value };
}

export const EMPTY_FILTER_MODEL: FilterGroup = Object.freeze({
  type: 'group',
  id: 'root',
  logic: 'and',
  children: [],
}) as FilterGroup;

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return node.type === 'group';
}

/** Depth-first list of all conditions in the model. */
export function flattenConditions(node: FilterNode | null | undefined): FilterCondition[] {
  if (!node) return [];
  if (node.type === 'condition') return [node];
  return node.children.flatMap(flattenConditions);
}

/**
 * A condition is active when it can constrain rows: its operator is known and
 * either requires no value or has a non-empty value.
 */
export function isConditionActive(condition: FilterCondition, registry: FilterOperatorRegistry): boolean {
  const def = registry.get(condition.operator);
  if (!def) return false;
  if (!operatorNeedsValue(def)) return true;
  const v = condition.value;
  if (Array.isArray(v)) return v.some((x) => !isEmptyValue(x));
  return !isEmptyValue(v);
}

export function getActiveConditions(
  model: FilterGroup | null | undefined,
  registry: FilterOperatorRegistry,
): FilterCondition[] {
  return flattenConditions(model).filter((c) => isConditionActive(c, registry));
}

/** Removes inactive conditions and empty groups. Returns `null` when nothing remains. */
export function pruneFilterModel(node: FilterGroup, registry: FilterOperatorRegistry): FilterGroup | null {
  const children: FilterNode[] = [];
  for (const child of node.children) {
    if (child.type === 'condition') {
      if (isConditionActive(child, registry)) children.push(child);
    } else {
      const pruned = pruneFilterModel(child, registry);
      if (pruned) children.push(pruned);
    }
  }
  return children.length ? { ...node, children } : null;
}

/** Immutable update of the node with `id`. Returns the original tree when not found. */
export function updateFilterNode(
  root: FilterGroup,
  id: string,
  updater: (node: FilterNode) => FilterNode | null,
): FilterGroup {
  if (root.id === id) {
    const next = updater(root);
    return next && next.type === 'group' ? next : { ...root, children: [] };
  }
  let changed = false;
  const children: FilterNode[] = [];
  for (const child of root.children) {
    if (child.id === id) {
      changed = true;
      const next = updater(child);
      if (next) children.push(next);
    } else if (child.type === 'group') {
      const next = updateFilterNode(child, id, updater);
      if (next !== child) changed = true;
      children.push(next);
    } else {
      children.push(child);
    }
  }
  return changed ? { ...root, children } : root;
}

export function removeFilterNode(root: FilterGroup, id: string): FilterGroup {
  return updateFilterNode(root, id, () => null);
}

export function addFilterNode(root: FilterGroup, parentId: string, node: FilterNode): FilterGroup {
  return updateFilterNode(root, parentId, (parent) =>
    parent.type === 'group' ? { ...parent, children: [...parent.children, node] } : parent,
  );
}

/** Removes every condition targeting `field` (any depth). */
export function removeConditionsForField(root: FilterGroup, field: string): FilterGroup {
  const strip = (group: FilterGroup): FilterGroup => ({
    ...group,
    children: group.children
      .filter((c) => !(c.type === 'condition' && c.field === field))
      .map((c) => (c.type === 'group' ? strip(c) : c)),
  });
  return strip(root);
}

/**
 * Column "quick filter" helpers. The quick filter for a column is the first
 * root-level condition targeting that column; the advanced builder can still
 * add further conditions for the same field.
 */
export function getColumnQuickFilter(root: FilterGroup | null | undefined, field: string): FilterCondition | undefined {
  return root?.children.find((c): c is FilterCondition => c.type === 'condition' && c.field === field);
}

export function setColumnQuickFilter(
  root: FilterGroup,
  field: string,
  operator: FilterOperator,
  value: FilterValue | undefined,
): FilterGroup {
  const existing = getColumnQuickFilter(root, field);
  if (existing) {
    return updateFilterNode(root, existing.id, (n) => ({ ...(n as FilterCondition), operator, value }));
  }
  return { ...root, children: [...root.children, createFilterCondition(field, operator, value)] };
}

export interface FilterEvaluationContext {
  registry: FilterOperatorRegistry;
  getValue: (field: string) => unknown;
  original: unknown;
}

/**
 * Evaluates a filter node against a row. Inactive conditions are ignored
 * (treated as neutral) so partially-filled builder rows don't hide data.
 */
export function evaluateFilterNode(node: FilterNode, ctx: FilterEvaluationContext): boolean {
  if (node.type === 'condition') {
    const def = ctx.registry.get(node.operator);
    if (!def || !isConditionActive(node, ctx.registry)) return true;
    return def.fn(ctx.getValue(node.field), node.value, ctx.original);
  }
  const active = node.children.filter((c) =>
    c.type === 'condition' ? isConditionActive(c, ctx.registry) : flattenConditions(c).some((x) => isConditionActive(x, ctx.registry)),
  );
  if (active.length === 0) return true;
  return node.logic === 'and'
    ? active.every((child) => evaluateFilterNode(child, ctx))
    : active.some((child) => evaluateFilterNode(child, ctx));
}

/**
 * Filters plain objects with a model, using `getFieldValue` to read fields.
 * Useful on the server (Node.js) or for pre-filtering outside the grid.
 */
export function applyFilterModel<T>(
  rows: readonly T[],
  model: FilterGroup | null | undefined,
  registry: FilterOperatorRegistry,
  getFieldValue: (row: T, field: string) => unknown,
): T[] {
  const pruned = model ? pruneFilterModel(model, registry) : null;
  if (!pruned) return [...rows];
  return rows.filter((row) =>
    evaluateFilterNode(pruned, { registry, original: row, getValue: (field) => getFieldValue(row, field) }),
  );
}
