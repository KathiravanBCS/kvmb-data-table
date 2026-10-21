import { useRef, useState } from 'react';
import { Button, Group, Stack } from '@mantine/core';
import { DataGrid, type ColumnLayout, type DataGridApi } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees, type Employee } from '../data';

const data = generateEmployees(100);

export default function ColumnManagementDemo() {
  const api = useRef<DataGridApi<Employee>>(null);
  const [saved, setSaved] = useState<ColumnLayout | null>(null);
  return (
    <Stack>
      <Group>
        <Button size="xs" variant="light" onClick={() => setSaved(api.current!.getColumnLayout())}>
          Save layout
        </Button>
        <Button size="xs" variant="light" disabled={!saved} onClick={() => saved && api.current!.setColumnLayout(saved)}>
          Restore layout
        </Button>
        <Button size="xs" variant="subtle" onClick={() => api.current!.resetColumnLayout()}>
          Reset
        </Button>
      </Group>
      <DataGrid
        apiRef={api}
        data={data}
        columns={[{ ...employeeColumns[0], meta: { ...employeeColumns[0].meta, locked: true } }, ...employeeColumns.slice(1)]}
        enableColumnResizing
        enableColumnOrdering
        enableColumnPinning
        defaultColumnPinning={{ left: ['name'] }}
        layoutMode="fixed"
        height={400}
        aria-label="Employees with column management"
      />
    </Stack>
  );
}
