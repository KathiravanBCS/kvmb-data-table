import { IconGripVertical } from '@tabler/icons-react';
import { useDragHandle } from './RowDragContext';

export interface DragHandleProps {
  label: string;
  size?: number;
  className?: string;
}

/** Keyboard-accessible drag handle (Space/Enter to pick up, arrows to move, Space to drop, Esc to cancel). */
export function DragHandle({ label, size = 16, className }: DragHandleProps) {
  const bindings = useDragHandle();
  if (!bindings) return null;
  const { attributes, listeners, setActivatorNodeRef, disabled } = bindings;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={className ?? 'mdg-drag-handle'}
      aria-label={label}
      disabled={disabled}
      {...attributes}
      {...(disabled ? {} : listeners)}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => e.stopPropagation()}
      data-dg-drag-handle=""
    >
      <IconGripVertical size={size} aria-hidden />
    </button>
  );
}
