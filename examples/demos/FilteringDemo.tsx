import { useState } from 'react';
import { Code, Stack } from '@mantine/core';
import {
  DataGrid,
  createFilterCondition,
  createFilterGroup,
  type FilterGroup,
  type FilterOperatorDefinition,
} from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const data = generateEmployees(500);

// A custom operator, offered for number columns.
const customOperators: FilterOperatorDefinition[] = [
  {
    operator: 'roundThousand',
    label: 'Is a round thousand',
    variants: ['number'],
    input: 'none',
    fn: (value) => typeof value === 'number' && value % 1000 === 0,
  },
];

const initialModel: FilterGroup = {
  ...createFilterGroup('and'),
  children: [
    createFilterCondition('department', 'in', ['Engineering', 'Sales']),
    {
      ...createFilterGroup('or'),
      children: [createFilterCondition('salary', 'gte', 150000), createFilterCondition('startDate', 'after', '2023-01-01')],
    },
  ],
};

export default function FilteringDemo() {
  const [model, setModel] = useState<FilterGroup>(initialModel);
  return (
    <Stack>
      <DataGrid
        data={data}
        columns={employeeColumns}
        enableFiltering
        filterModel={model}
        onFilterModelChange={setModel}
        filterOperators={customOperators}
        defaultFilterPresets={[
          { id: 'eng', name: 'Engineering only', model: { ...createFilterGroup('and'), children: [createFilterCondition('department', 'in', ['Engineering'])] } },
        ]}
        height={380}
        aria-label="Filterable employees"
      />
      {/* The model is plain JSON: send it to your API as-is. */}
      <Code block mah={220} style={{ overflow: 'auto' }}>
        {JSON.stringify(model, null, 2)}
      </Code>
    </Stack>
  );
}
