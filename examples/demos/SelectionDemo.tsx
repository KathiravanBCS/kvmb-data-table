import { useState } from 'react';
import { Button, Code, Stack } from '@mantine/core';
import type { RowSelectionState } from '@tanstack/react-table';
import { DataGrid } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const initial = generateEmployees(150);

export default function SelectionDemo() {
  const [data, setData] = useState(initial);
  const [selection, setSelection] = useState<RowSelectionState>({});
  return (
    <Stack>
      <DataGrid
        data={data}
        columns={employeeColumns}
        getRowId={(row) => row.id}
        enableRowSelection={(row) => row.original.active}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        enablePagination
        enableFiltering
        defaultPagination={{ pageSize: 10 }}
        renderBulkActions={({ selectedRows, clearSelection }) => (
          <Button
            size="compact-xs"
            color="red"
            variant="light"
            onClick={() => {
              const ids = new Set(selectedRows.map((r) => r.id));
              setData((rows) => rows.filter((r) => !ids.has(r.id)));
              clearSelection();
            }}
          >
            Delete {selectedRows.length}
          </Button>
        )}
        aria-label="Selectable employees (inactive rows cannot be selected)"
      />
      <Code block>{JSON.stringify(Object.keys(selection))}</Code>
    </Stack>
  );
}
