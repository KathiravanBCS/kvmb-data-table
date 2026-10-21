import { useCallback, useRef, useState } from 'react';
import type { Updater } from '@tanstack/react-table';

export function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(previous) : updater;
}

/**
 * State that is controlled when `value` is defined and uncontrolled otherwise.
 * The setter accepts TanStack-style updaters and always notifies `onChange`
 * with the resolved value.
 */
export function useControllableState<T>(
  value: T | undefined,
  onChange: ((value: T) => void) | undefined,
  defaultValue: T | (() => T),
): [T, (updater: Updater<T>) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;

  const setValue = useCallback((updater: Updater<T>) => {
    const next = resolveUpdater(updater, currentRef.current);
    if (Object.is(next, currentRef.current)) return;
    // Keep the ref in sync so consecutive updates in one tick compose correctly.
    currentRef.current = next;
    if (!controlledRef.current) setInternal(next);
    onChangeRef.current?.(next);
  }, []);

  return [current, setValue];
}
