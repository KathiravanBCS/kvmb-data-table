/** Minimal stand-in for a toast library so the examples stay dependency-free. */
export function notifyError(error: unknown) {
  console.warn('[demo] save failed:', error instanceof Error ? error.message : error);
}
