import { useMemo, useState } from 'react';
import { Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { DataGrid } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const SIZES = ['10000', '100000'];

export default function VirtualizationDemo() {
  const [size, setSize] = useState('10000');
  const { data, ms } = useMemo(() => {
    const t0 = performance.now();
    const rows = generateEmployees(Number(size));
    return { data: rows, ms: performance.now() - t0 };
  }, [size]);

  return (
    <Stack>
      <Group>
        <SegmentedControl value={size} onChange={setSize} data={SIZES.map((s) => ({ value: s, label: `${Number(s).toLocaleString()} rows` }))} />
        <Text size="xs" c="dimmed">
          Generated in {ms.toFixed(0)} ms · only visible rows are in the DOM
        </Text>
      </Group>
      <DataGrid
        data={data}
        columns={employeeColumns}
        enableVirtualization
        enableFiltering
        enableRowSelection
        enableColumnResizing
        enableEditing
        overscan={10}
        height={520}
        aria-label="Virtualized employees"
      />
    </Stack>
  );
}
