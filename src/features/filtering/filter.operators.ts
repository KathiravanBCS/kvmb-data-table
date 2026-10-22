import type { FilterOperator, FilterOperatorDefinition, FilterValue, FilterVariant } from './filter.types';

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).toLowerCase();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'bigint') return Number(value);
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Converts a cell value or filter value to a day number (days since epoch, UTC-agnostic)
 * so date comparisons ignore time of day and time zone offsets of the calendar date.
 */
export function toDayNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
    date = new Date(value);
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    return null;
  }
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function asRange(value: FilterValue | undefined): [unknown, unknown] {
  if (Array.isArray(value)) return [value[0] ?? null, value[1] ?? null];
  return [null, null];
}

function asArray(value: FilterValue | undefined): ReadonlyArray<string | number | boolean | null> {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value as string | number | boolean];
}

function normalizeSetMember(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function inSet(cellValue: unknown, filterValue: FilterValue | undefined): boolean {
  const set = asArray(filterValue).map(normalizeSetMember);
  if (set.length === 0) return true;
  if (Array.isArray(cellValue)) return cellValue.some((v) => set.includes(normalizeSetMember(v)));
  return set.includes(normalizeSetMember(cellValue));
}

const TEXT: FilterVariant[] = ['text'];
const NUMBER: FilterVariant[] = ['number'];
const DATE: FilterVariant[] = ['date'];
const ALL: FilterVariant[] = ['text', 'number', 'date', 'boolean', 'select', 'multiSelect'];

const textOp = (operator: FilterOperator, label: string, test: (cell: string, filter: string) => boolean): FilterOperatorDefinition => ({
  operator,
  label,
  variants: TEXT,
  input: 'text',
  fn: (cellValue, filterValue) => {
    if (isEmptyValue(filterValue)) return true;
    return test(toText(cellValue), toText(filterValue));
  },
});

const numberOp = (operator: FilterOperator, label: string, test: (cell: number, filter: number) => boolean): FilterOperatorDefinition => ({
  operator,
  label,
  variants: NUMBER,
  input: 'number',
  fn: (cellValue, filterValue) => {
    const f = toNumber(filterValue);
    if (f === null) return true;
    const c = toNumber(cellValue);
    if (c === null) return false;
    return test(c, f);
  },
});

const dateOp = (operator: FilterOperator, label: string, test: (cell: number, filter: number) => boolean): FilterOperatorDefinition => ({
  operator,
  label,
  variants: DATE,
  input: 'date',
  fn: (cellValue, filterValue) => {
    const f = toDayNumber(filterValue);
    if (f === null) return true;
    const c = toDayNumber(cellValue);
    if (c === null) return false;
    return test(c, f);
  },
});

function between(convert: (v: unknown) => number | null): FilterOperatorDefinition['fn'] {
  return (cellValue, filterValue) => {
    const [rawMin, rawMax] = asRange(filterValue);
    const min = convert(rawMin);
    const max = convert(rawMax);
    if (min === null && max === null) return true;
    const c = convert(cellValue);
    if (c === null) return false;
    if (min !== null && c < min) return false;
    if (max !== null && c > max) return false;
    return true;
  };
}

/** Built-in operators, in the order they are offered in the UI. */
export const builtInFilterOperators: readonly FilterOperatorDefinition[] = [
  textOp('contains', 'Contains', (c, f) => c.includes(f)),
  textOp('notContains', 'Does not contain', (c, f) => !c.includes(f)),
  textOp('equals', 'Equals', (c, f) => c === f),
  textOp('notEquals', 'Does not equal', (c, f) => c !== f),
  textOp('startsWith', 'Starts with', (c, f) => c.startsWith(f)),
  textOp('endsWith', 'Ends with', (c, f) => c.endsWith(f)),

  numberOp('eq', '=', (c, f) => c === f),
  numberOp('neq', '≠', (c, f) => c !== f),
  numberOp('gt', '>', (c, f) => c > f),
  numberOp('gte', '≥', (c, f) => c >= f),
  numberOp('lt', '<', (c, f) => c < f),
  numberOp('lte', '≤', (c, f) => c <= f),
  { operator: 'between', label: 'Between', variants: NUMBER, input: 'numberRange', fn: between(toNumber) },

  dateOp('on', 'On', (c, f) => c === f),
  dateOp('notOn', 'Not on', (c, f) => c !== f),
  dateOp('before', 'Before', (c, f) => c < f),
  dateOp('after', 'After', (c, f) => c > f),
  dateOp('onOrBefore', 'On or before', (c, f) => c <= f),
  dateOp('onOrAfter', 'On or after', (c, f) => c >= f),
  { operator: 'dateBetween', label: 'Between', variants: DATE, input: 'dateRange', fn: between(toDayNumber) },

  { operator: 'isTrue', label: 'Is true', variants: ['boolean'], input: 'none', fn: (c) => c === true },
  { operator: 'isFalse', label: 'Is false', variants: ['boolean'], input: 'none', fn: (c) => c === false },

  { operator: 'in', label: 'Is any of', variants: ['select', 'multiSelect'], input: 'multiSelect', fn: inSet },
  {
    operator: 'notIn',
    label: 'Is none of',
    variants: ['select', 'multiSelect'],
    input: 'multiSelect',
    fn: (c, f) => (asArray(f).length === 0 ? true : !inSet(c, f)),
  },

  { operator: 'isEmpty', label: 'Is empty', variants: ALL, input: 'none', fn: (c) => isEmptyValue(c) },
  { operator: 'isNotEmpty', label: 'Is not empty', variants: ALL, input: 'none', fn: (c) => !isEmptyValue(c) },
];

/** Default operator applied when a filter is created for a column variant. */
export const defaultOperatorByVariant: Record<FilterVariant, FilterOperator> = {
  text: 'contains',
  number: 'eq',
  date: 'on',
  boolean: 'isTrue',
  select: 'in',
  multiSelect: 'in',
};

export type FilterOperatorRegistry = ReadonlyMap<string, FilterOperatorDefinition>;

export function createOperatorRegistry(custom: readonly FilterOperatorDefinition[] = []): FilterOperatorRegistry {
  const map = new Map<string, FilterOperatorDefinition>();
  for (const def of builtInFilterOperators) map.set(def.operator, def);
  for (const def of custom) map.set(def.operator, def);
  return map;
}

export function getOperatorsForVariant(registry: FilterOperatorRegistry, variant: FilterVariant): FilterOperatorDefinition[] {
  return [...registry.values()].filter((def) => def.variants.includes(variant));
}

/** Whether a condition's value makes it "active" (i.e. it actually constrains rows). */
export function operatorNeedsValue(def: FilterOperatorDefinition | undefined): boolean {
  return !!def && def.input !== 'none';
}
