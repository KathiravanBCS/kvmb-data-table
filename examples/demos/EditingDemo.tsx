import { useState } from 'react';
import { SegmentedControl, Stack, Switch, Group, Text } from '@mantine/core';
import { notifyError } from '../notify';
import { DataGrid, type EditMode } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees, type Employee } from '../data';

const fakeApi = {
  /** Simulates a PATCH request; fails ~20% of the time when `flaky` is on. */
  async update(row: Employee, flaky: boolean): Promise<Employee> {
    await new Promise((r) => setTimeout(r, 600));
    if (flaky && Math.random() < 0.2) throw new Error('Server rejected the update (simulated)');
    return row;
  },
};

export default function EditingDemo() {
  const [data, setData] = useState(() => generateEmployees(60));
  const [mode, setMode] = useState<EditMode>('cell');
  const [flaky, setFlaky] = useState(true);
  const [optimistic, setOptimistic] = useState(true);

  return (
    <Stack>
      <Group>
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as EditMode)}
          data={[
            { value: 'cell', label: 'Cell editing' },
            { value: 'row', label: 'Row editing' },
          ]}
        />
        <Switch label="Random save failures" checked={flaky} onChange={(e) => setFlaky(e.currentTarget.checked)} />
        <Switch label="Optimistic updates" checked={optimistic} onChange={(e) => setOptimistic(e.currentTarget.checked)} />
      </Group>
      <Text size="sm" c="dimmed">
        Double-click a cell (or press Enter / start typing) to edit. Enter saves, Escape cancels, Tab moves to the next editable cell.
      </Text>
      <DataGrid
        data={data}
        columns={employeeColumns}
        enableEditing
        editMode={mode}
        optimisticUpdates={optimistic}
        isRowEditable={(row) => row.active}
        onRowUpdate={async (updated) => {
          const saved = await fakeApi.update(updated, flaky);
          setData((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
          return saved;
        }}
        onEditError={(error) => notifyError(error)}
        height={420}
        aria-label="Editable employees (inactive employees are read-only)"
      />
    </Stack>
  );
}
