import { useCallback, useEffect, useRef, useState } from 'react';
import { Code, Stack } from '@mantine/core';
import { DataGrid, toSearchParams, type DataGridQuery } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import type { Employee } from '../data';
import type { Paginated } from '../server/employees.service';
import { apiFetch } from '../server/mockFetch';

export default function ServerSideDemo() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUrl, setLastUrl] = useState('');
  const [query, setQuery] = useState<DataGridQuery | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (q: DataGridQuery) => {
    // Cancel the previous request: only the latest query's response is applied.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const url = `/api/employees?${toSearchParams(q).toString()}`;
    setLastUrl(decodeURIComponent(url));
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<Paginated<Employee>>(url, { signal: controller.signal });
      setRows(result.data);
      setTotal(result.meta.total);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <Stack>
      <DataGrid
        data={rows}
        columns={employeeColumns}
        getRowId={(row) => row.id}
        manualPagination
        manualSorting
        manualFiltering
        rowCount={total}
        enablePagination
        enableFiltering
        enableEditing
        enableRowSelection
        globalFilterDebounce={400}
        loading={loading}
        error={error}
        onRetry={() => query && load(query)}
        onQueryChange={(q) => {
          setQuery(q);
          void load(q);
        }}
        onRowUpdate={async (row) => {
          const saved = await apiFetch<Employee>(`/api/employees/${row.id}`, { method: 'PATCH', body: JSON.stringify(row) });
          setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
          return saved;
        }}
        height={440}
        aria-label="Server-side employees"
      />
      <Code block>{lastUrl}</Code>
    </Stack>
  );
}
