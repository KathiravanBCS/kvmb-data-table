import { Button, Stack, Text } from '@mantine/core';
import { DataGrid, clearPersistedState } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const data = generateEmployees(120);
const persist = {
  key: 'docs-persistence-demo',
  include: [
    'sorting',
    'filterModel',
    'columnVisibility',
    'columnOrder',
    'columnSizing',
    'columnPinning',
    'density',
    'filterPresets',
    'pagination',
  ] as const,
};

export default function PersistenceDemo() {
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Sort, filter, resize, hide or pin columns, then reload the page: the layout is restored from localStorage.
      </Text>
      <DataGrid
        data={data}
        columns={employeeColumns}
        persistState={persist}
        enableFiltering
        enableColumnResizing
        enableColumnOrdering
        enableColumnPinning
        enablePagination
        defaultPagination={{ pageSize: 10 }}
        aria-label="Persisted employees grid"
      />
      <Button
        size="xs"
        variant="subtle"
        w="fit-content"
        onClick={() => {
          clearPersistedState(persist);
          window.location.reload();
        }}
      >
        Clear saved state
      </Button>
    </Stack>
  );
}
