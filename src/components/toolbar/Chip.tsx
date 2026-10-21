import type { ReactNode } from 'react';
import { Badge, CloseButton } from '@mantine/core';

export interface RemovableChipProps {
  children: ReactNode;
  removeLabel: string;
  onRemove: () => void;
}

/**
 * Keyboard-accessible removable chip. (Mantine's `Pill` hides its remove button
 * from assistive technology, which is unsuitable for filter chips.)
 */
export function RemovableChip({ children, removeLabel, onRemove }: RemovableChipProps) {
  return (
    <Badge
      variant="default"
      size="lg"
      radius="xl"
      tt="none"
      fw={500}
      className="mdg-chip"
      rightSection={<CloseButton size="xs" radius="xl" aria-label={removeLabel} onClick={onRemove} />}
    >
      {children}
    </Badge>
  );
}
