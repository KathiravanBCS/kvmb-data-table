/**
 * Serializable, typed filter model.
 *
 * The model is plain JSON (no functions, no Date instances) so it can be stored,
 * sent to a backend API, or restored from a URL without transformation.
 * Dates are represented as ISO `YYYY-MM-DD` (date) or ISO-8601 (date-time) strings.
 */

/** Value editors / operator sets available for a column. */
export type FilterVariant = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiSelect';

export type TextFilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith';

export type NumberFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between';

export type DateFilterOperator = 'on' | 'notOn' | 'before' | 'after' | 'onOrBefore' | 'onOrAfter' | 'dateBetween';

export type BooleanFilterOperator = 'isTrue' | 'isFalse';

export type SetFilterOperator = 'in' | 'notIn';

export type NullFilterOperator = 'isEmpty' | 'isNotEmpty';

export type BuiltInFilterOperator =
  | TextFilterOperator
  | NumberFilterOperator
  | DateFilterOperator
  | BooleanFilterOperator
  | SetFilterOperator
  | NullFilterOperator;

/**
 * Operator identifier. Built-in operators are listed in {@link BuiltInFilterOperator};
 * custom operators registered via the `filterOperators` prop may use any other string.
 */
export type FilterOperator = BuiltInFilterOperator | (string & {});

/** JSON-serializable value carried by a filter condition. */
export type FilterValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<string | number | boolean | null>;

export interface FilterCondition {
  type: 'condition';
  /** Stable identifier (unique within the model). */
  id: string;
  /** Column id the condition applies to. */
  field: string;
  operator: FilterOperator;
  /** Operator argument. `between` operators use a two-element tuple `[min, max]`. */
  value?: FilterValue;
}

export type FilterLogic = 'and' | 'or';

export interface FilterGroup {
  type: 'group';
  id: string;
  logic: FilterLogic;
  children: FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

/** Named, persisted filter model. */
export interface FilterPreset {
  id: string;
  name: string;
  model: FilterGroup;
}

/** Shape of the input rendered for an operator's value. */
export type FilterValueInputKind = 'none' | 'text' | 'number' | 'numberRange' | 'date' | 'dateRange' | 'select' | 'multiSelect';

export interface FilterOperatorDefinition {
  /** Operator id stored in the model. */
  operator: FilterOperator;
  /** Visible label in operator pickers. */
  label: string;
  /** Column filter variants this operator is offered for. */
  variants: readonly FilterVariant[];
  /** Kind of value input the filter UI renders. */
  input: FilterValueInputKind;
  /**
   * Predicate. `cellValue` is the column value for the row (`row.getValue(field)`),
   * `filterValue` is the condition's value. `row` is the original row data.
   */
  fn: (cellValue: unknown, filterValue: FilterValue | undefined, row: unknown) => boolean;
}

export interface FilterOption {
  value: string;
  label: string;
}
