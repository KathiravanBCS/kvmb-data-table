import { useRef } from 'react';

/** Ref that always holds the latest value (assigned during render). */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
