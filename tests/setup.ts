import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom lacks these browser APIs used by Mantine / dnd-kit / virtualization.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in window)) {
  Object.assign(window, { ResizeObserver: ResizeObserverMock });
  Object.assign(globalThis, { ResizeObserver: ResizeObserverMock });
}

Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.scrollTo ??= function scrollTo() {};
window.HTMLElement.prototype.hasPointerCapture ??= () => false;
window.HTMLElement.prototype.releasePointerCapture ??= () => {};

if (!URL.createObjectURL) {
  Object.assign(URL, { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} });
}
