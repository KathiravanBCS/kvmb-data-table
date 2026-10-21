import { useState } from 'react';
import { Text, Stack } from '@mantine/core';
import { DataGrid } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

export default function DragDropDemo() {
  const [data, setData] = useState(() => generateEmployees(12));
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Drag the handle (or focus it and press Space, the arrow keys, then Space) to reorder rows. Column headers can be dragged too.
      </Text>
      <DataGrid
        data={data}
        columns={employeeColumns.slice(0, 6)}
        enableRowDragging
        enableColumnOrdering
        enableSorting={false}
        onRowReorder={({ reorderedData }) => setData(reorderedData)}
        aria-label="Reorderable employees"
      />
    </Stack>
  );
}
