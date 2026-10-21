import { describe, expect, it } from 'vitest';
import { getByPath, setByPath } from '../../src/utils/path';
import { computeColumnLayout, getCellLayoutStyle } from '../../src/features/pinning/pinning';
import { toSearchParams, toServerQuery, createFilterCondition, createFilterGroup } from '../../src';
import { clearPersistedState, loadPersistedState, savePersistedState, type GridStateStorage } from '../../src';

describe('path helpers', () => {
  it('reads nested paths', () => {
    expect(getByPath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    expect(getByPath({ a: null }, 'a.b')).toBeUndefined();
  });

  it('writes nested paths immutably', () => {
    const source = { a: { b: 1, keep: true }, other: [1] };
    const next = setByPath(source, 'a.b', 2);
    expect(next).toEqual({ a: { b: 2, keep: true }, other: [1] });
    expect(source.a.b).toBe(1);
    expect(next.other).toBe(source.other);
    expect(setByPath({}, 'x.y', 'z')).toEqual({ x: { y: 'z' } });
  });
});

describe('pinning layout', () => {
  it('computes sticky offsets and edges', () => {
    const layout = computeColumnLayout([
      { id: 'a', size: 40, pinned: 'left' },
      { id: 'b', size: 100, pinned: 'left' },
      { id: 'c', size: 200, pinned: false },
      { id: 'd', size: 80, pinned: 'right' },
      { id: 'e', size: 60, pinned: 'right' },
    ]);
    expect(layout.map((l) => [l.id, l.offset, l.edge])).toEqual([
      ['a', 0, false],
      ['b', 40, true],
      ['c', 0, false],
      ['d', 60, true],
      ['e', 0, false],
    ]);
    expect(getCellLayoutStyle(layout[2], true).flex).toBe('200 0 200px');
    expect(getCellLayoutStyle(layout[1], true)).toMatchObject({ left: 40, flex: '0 0 100px' });
    expect(getCellLayoutStyle(layout[2], false).flex).toBe('0 0 200px');
  });
});

describe('server adapters', () => {
  const query = {
    pagination: { pageIndex: 2, pageSize: 25 },
    sorting: [{ id: 'name', desc: false }, { id: 'salary', desc: true }],
    filterModel: { ...createFilterGroup('and'), children: [createFilterCondition('name', 'contains', 'an'), createFilterCondition('salary', 'gt', '')] },
    globalFilter: '  smith ',
  };

  it('normalises the query', () => {
    const q = toServerQuery(query);
    expect(q).toMatchObject({ page: 3, pageSize: 25, offset: 50, limit: 25, search: 'smith' });
    expect(q.sort).toEqual([{ field: 'name', direction: 'asc' }, { field: 'salary', direction: 'desc' }]);
    expect(q.filter?.children).toHaveLength(1);
  });

  it('serialises to URL params', () => {
    const params = toSearchParams(query);
    expect(params.get('page')).toBe('3');
    expect(params.get('sort')).toBe('name:asc,salary:desc');
    expect(JSON.parse(params.get('filter')!).children[0].field).toBe('name');
  });
});

describe('persistence', () => {
  const memory = (): GridStateStorage & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };

  it('round-trips included keys only', () => {
    const storage = memory();
    const options = { key: 'grid', storage, include: ['sorting', 'density'] as const };
    savePersistedState(options, { sorting: [{ id: 'a', desc: true }], density: 'compact', columnVisibility: { a: false } });
    expect(loadPersistedState(options)).toEqual({ sorting: [{ id: 'a', desc: true }], density: 'compact' });
    clearPersistedState(options);
    expect(loadPersistedState(options)).toEqual({});
  });

  it('discards state from another version and tolerates corrupt data', () => {
    const storage = memory();
    savePersistedState({ key: 'g', storage, version: 1 }, { sorting: [] });
    expect(loadPersistedState({ key: 'g', storage, version: 2 })).toEqual({});
    storage.setItem('g', '{not json');
    expect(loadPersistedState({ key: 'g', storage })).toEqual({});
  });
});
