import { createContext, useContext } from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

export interface DragHandleBindings {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  disabled: boolean;
  isDragging: boolean;
}

/** Provided by sortable rows / header cells so a nested drag handle can bind to them. */
export const DragHandleContext = createContext<DragHandleBindings | null>(null);

export function useDragHandle(): DragHandleBindings | null {
  return useContext(DragHandleContext);
}
