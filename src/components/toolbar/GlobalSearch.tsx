import { useEffect, useRef, useState } from 'react';
import { CloseButton, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import type { RowData } from '@tanstack/react-table';
import { useDataGridContext } from '../../core/DataGridProvider';

/** Debounced global search box bound to the grid's global filter. */
export function GlobalSearch<TData extends RowData>() {
  const { table, labels, globalFilterDebounce } = useDataGridContext<TData>();
  const committed = (table.getState().globalFilter as string | undefined) ?? '';
  const [value, setValue] = useState(committed);
  // Last value this input committed; anything else arriving is an external change.
  const sentRef = useRef(committed);
  const commit = useDebouncedCallback((next: string) => {
    sentRef.current = next;
    table.setGlobalFilter(next);
  }, globalFilterDebounce);
  const clear = () => {
    commit.cancel?.();
    sentRef.current = '';
    setValue('');
    table.setGlobalFilter('');
  };

  // Sync external changes (controlled prop, API, "clear all").
  useEffect(() => {
    if (committed !== sentRef.current) {
      sentRef.current = committed;
      setValue(committed);
    }
  }, [committed]);

  return (
    <TextInput
      size="xs"
      className="mdg-search"
      type="search"
      placeholder={labels.searchPlaceholder}
      aria-label={labels.searchAriaLabel}
      leftSection={<IconSearch size={14} aria-hidden />}
      value={value}
      onChange={(e) => {
        setValue(e.currentTarget.value);
        commit(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && value) {
          e.preventDefault();
          clear();
        }
      }}
      rightSection={
        value ? (
          <CloseButton
            size="xs"
            aria-label={labels.clearSearch}
            onClick={clear}
          />
        ) : null
      }
    />
  );
}
