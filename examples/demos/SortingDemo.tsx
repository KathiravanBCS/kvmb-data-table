import { useState } from 'react';
import { Code, Stack } from '@mantine/core';
import type { SortingState } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const data = generateEmployees(200);

export default function SortingDemo() {
  // Controlled sorting: click headers, Shift+click to add secondary sorts.
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'department', desc: false },
    { id: 'salary', desc: true },
  ]);
  return (
    <Stack>
      <DataGrid
        data={data}
        columns={employeeColumns}
        sorting={sorting}
        onSortingChange={setSorting}
        height={360}
        aria-label="Sortable employees"
      />
      <Code block>{JSON.stringify(sorting, null, 2)}</Code>
    </Stack>
  );
}
