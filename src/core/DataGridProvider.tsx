import { createContext, useContext } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { DataGridContextValue } from './useDataGrid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- context is shared across all row types; consumers narrow it with useDataGridContext<TData>()
export const DataGridContext = createContext<DataGridContextValue<any> | null>(null);

export const DataGridProvider = DataGridContext.Provider;

/**
 * Access the grid from custom cells, headers, toolbars or bulk actions
 * rendered inside a `DataGrid`.
 */
export function useDataGridContext<TData extends RowData = unknown>(): DataGridContextValue<TData> {
  const ctx = useContext(DataGridContext);
  if (!ctx) throw new Error('useDataGridContext must be used inside <DataGrid>.');
  return ctx as DataGridContextValue<TData>;
}
