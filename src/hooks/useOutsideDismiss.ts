import { useEffect } from 'react';

/**
 * Closes a floating panel on pointer-down outside of it. Unlike Mantine's built-in
 * click-outside handling, elements matching `ignoreSelector` (e.g. nested Select or
 * date-picker dropdowns rendered in portals) count as "inside".
 */
export function useOutsideDismiss(opened: boolean, close: () => void, ignoreSelector: string) {
  useEffect(() => {
    if (!opened) return;
    const handler = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(ignoreSelector)) return;
      close();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [opened, close, ignoreSelector]);
}
