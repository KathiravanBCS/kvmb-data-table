/** Reads a dotted path (`a.b.c`) from an object. */
export function getByPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Immutably writes a dotted path, shallow-copying every object along the way. */
export function setByPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const write = (target: unknown, index: number): unknown => {
    const key = keys[index];
    const source = (target ?? {}) as Record<string, unknown>;
    const copy: Record<string, unknown> = Array.isArray(source) ? ([...source] as unknown as Record<string, unknown>) : { ...source };
    copy[key] = index === keys.length - 1 ? value : write(source[key], index + 1);
    return copy;
  };
  return write(obj, 0) as T;
}
