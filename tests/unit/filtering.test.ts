import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTER_MODEL,
  addFilterNode,
  applyFilterModel,
  createFilterCondition,
  createFilterGroup,
  createOperatorRegistry,
  getActiveConditions,
  pruneFilterModel,
  removeFilterNode,
  updateFilterNode,
  type FilterGroup,
} from '../../src';
import { getColumnQuickFilter, setColumnQuickFilter } from '../../src/features/filtering/filter.model';
import { toDayNumber } from '../../src/features/filtering/filter.operators';
import { employees, type Employee } from '../utils';

const registry = createOperatorRegistry();
const get = (row: Employee, field: string) => (row as unknown as Record<string, unknown>)[field];
const names = (rows: Employee[]) => rows.map((r) => r.name);
const run = (model: FilterGroup) => names(applyFilterModel(employees, model, registry, get));
const and = (...children: FilterGroup['children']): FilterGroup => ({ ...createFilterGroup('and'), children });
const or = (...children: FilterGroup['children']): FilterGroup => ({ ...createFilterGroup('or'), children });
const c = createFilterCondition;

describe('text operators', () => {
  it.each([
    ['contains', 'a', ['Alice', 'Carol', 'Dan']],
    ['notContains', 'a', ['Bob', 'Eve']],
    ['equals', 'ALICE', ['Alice']],
    ['notEquals', 'alice', ['Bob', 'Carol', 'Dan', 'Eve']],
    ['startsWith', 'c', ['Carol']],
    ['endsWith', 'e', ['Alice', 'Eve']],
  ])('%s %s', (operator, value, expected) => {
    expect(run(and(c('name', operator, value)))).toEqual(expected);
  });
});

describe('number operators', () => {
  it.each([
    ['eq', 80000, ['Bob']],
    ['neq', 80000, ['Alice', 'Carol', 'Dan', 'Eve']],
    ['gt', 95000, ['Alice', 'Carol']],
    ['gte', 95000, ['Alice', 'Carol', 'Eve']],
    ['lt', 80000, ['Dan']],
    ['lte', 80000, ['Bob', 'Dan']],
  ])('%s %s', (operator, value, expected) => {
    expect(run(and(c('salary', operator, value)))).toEqual(expected);
  });

  it('between is inclusive and supports open ranges', () => {
    expect(run(and(c('salary', 'between', [80000, 120000])))).toEqual(['Alice', 'Bob', 'Eve']);
    expect(run(and(c('salary', 'between', [null, 80000])))).toEqual(['Bob', 'Dan']);
    expect(run(and(c('salary', 'between', [125000, null])))).toEqual(['Carol']);
  });
});

describe('date operators', () => {
  it.each([
    ['on', '2020-01-15', ['Alice']],
    ['before', '2020-01-15', ['Bob', 'Eve']],
    ['after', '2021-07-20', ['Dan']],
    ['onOrAfter', '2021-07-20', ['Carol', 'Dan']],
    ['onOrBefore', '2019-03-01', ['Bob', 'Eve']],
  ])('%s %s', (operator, value, expected) => {
    expect(run(and(c('startDate', operator, value)))).toEqual(expected);
  });

  it('dateBetween', () => {
    expect(run(and(c('startDate', 'dateBetween', ['2019-01-01', '2021-12-31'])))).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('compares calendar days regardless of time and Date objects', () => {
    expect(toDayNumber('2024-03-10')).toBe(toDayNumber(new Date(2024, 2, 10, 23, 59)));
    expect(toDayNumber('not a date')).toBeNull();
  });
});

describe('boolean, set and null operators', () => {
  it('isTrue / isFalse', () => {
    expect(run(and(c('active', 'isTrue')))).toEqual(['Alice', 'Carol', 'Dan']);
    expect(run(and(c('active', 'isFalse')))).toEqual(['Bob', 'Eve']);
  });

  it('in / notIn', () => {
    expect(run(and(c('department', 'in', ['Sales', 'Marketing'])))).toEqual(['Bob', 'Dan', 'Eve']);
    expect(run(and(c('department', 'notIn', ['Engineering'])))).toEqual(['Bob', 'Dan', 'Eve']);
  });

  it('isEmpty / isNotEmpty', () => {
    const rows = [...employees, { ...employees[0], id: '6', name: '' }];
    const result = applyFilterModel(rows, and(c('name', 'isEmpty')), registry, get);
    expect(result).toHaveLength(1);
    expect(applyFilterModel(rows, and(c('name', 'isNotEmpty')), registry, get)).toHaveLength(5);
  });
});

describe('groups', () => {
  it('AND combines conditions', () => {
    expect(run(and(c('department', 'in', ['Engineering']), c('salary', 'gt', 125000)))).toEqual(['Carol']);
  });

  it('OR combines conditions', () => {
    expect(run(or(c('name', 'equals', 'Bob'), c('name', 'equals', 'Dan')))).toEqual(['Bob', 'Dan']);
  });

  it('supports nested groups', () => {
    // Engineering AND (salary < 125000 OR active = false)
    const model = and(c('department', 'in', ['Engineering']), or(c('salary', 'lt', 125000), c('active', 'isFalse')));
    expect(run(model)).toEqual(['Alice']);
  });

  it('ignores incomplete conditions', () => {
    expect(run(and(c('name', 'contains', ''), c('salary', 'between', [null, null])))).toHaveLength(5);
    expect(run(or(c('name', 'contains', ''), c('name', 'equals', 'Bob')))).toEqual(['Bob']);
  });

  it('supports custom operators', () => {
    const custom = createOperatorRegistry([
      { operator: 'evenSalary', label: 'Even (k)', variants: ['number'], input: 'none', fn: (v) => (v as number) % 20000 === 0 },
    ]);
    expect(names(applyFilterModel(employees, and(c('salary', 'evenSalary')), custom, get))).toEqual(['Alice', 'Bob']);
  });
});

describe('model helpers', () => {
  it('add / update / remove nodes immutably', () => {
    let model = createFilterGroup('and');
    const cond = c('name', 'contains', 'a');
    model = addFilterNode(model, model.id, cond);
    expect(model.children).toHaveLength(1);
    const before = model;
    model = updateFilterNode(model, cond.id, (n) => ({ ...n, value: 'b' }) as typeof n);
    expect(before.children[0]).toMatchObject({ value: 'a' });
    expect(model.children[0]).toMatchObject({ value: 'b' });
    model = removeFilterNode(model, cond.id);
    expect(model.children).toHaveLength(0);
  });

  it('prunes inactive conditions and empty groups', () => {
    const model = and(c('name', 'contains', ''), or(c('salary', 'gt', null)), c('active', 'isTrue'));
    const pruned = pruneFilterModel(model, registry);
    expect(pruned?.children).toHaveLength(1);
    expect(pruneFilterModel(and(c('name', 'contains', '')), registry)).toBeNull();
  });

  it('counts active conditions', () => {
    expect(getActiveConditions(and(c('name', 'contains', 'x'), c('name', 'contains', '')), registry)).toHaveLength(1);
  });

  it('column quick filter targets the first root condition for a field', () => {
    let model: FilterGroup = { ...EMPTY_FILTER_MODEL, children: [] };
    model = setColumnQuickFilter(model, 'name', 'contains', 'al');
    model = setColumnQuickFilter(model, 'name', 'startsWith', 'b');
    expect(model.children).toHaveLength(1);
    expect(getColumnQuickFilter(model, 'name')).toMatchObject({ operator: 'startsWith', value: 'b' });
  });

  it('is JSON serialisable', () => {
    const model = and(c('salary', 'between', [1, 2]), or(c('name', 'in', ['a', 'b'])));
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
  });
});
