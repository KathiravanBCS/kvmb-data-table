import type { ReactElement, ReactNode } from 'react';
import { MantineProvider, type MantineThemeOverride } from '@mantine/core';
import { render, type RenderOptions } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

export function renderWithMantine(
  ui: ReactElement,
  { theme, colorScheme = 'light', ...options }: RenderOptions & { theme?: MantineThemeOverride; colorScheme?: 'light' | 'dark' } = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider theme={theme} forceColorScheme={colorScheme} env="test">
      {children}
    </MantineProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
  startDate: string;
  active: boolean;
  address?: { city: string };
}

export const employees: Employee[] = [
  { id: '1', name: 'Alice', department: 'Engineering', salary: 120000, startDate: '2020-01-15', active: true, address: { city: 'Berlin' } },
  { id: '2', name: 'Bob', department: 'Sales', salary: 80000, startDate: '2019-03-01', active: false, address: { city: 'Paris' } },
  { id: '3', name: 'Carol', department: 'Engineering', salary: 135000, startDate: '2021-07-20', active: true, address: { city: 'London' } },
  { id: '4', name: 'Dan', department: 'Marketing', salary: 70000, startDate: '2022-11-05', active: true, address: { city: 'Berlin' } },
  { id: '5', name: 'Eve', department: 'Sales', salary: 95000, startDate: '2018-05-30', active: false, address: { city: 'Madrid' } },
];

export const employeeColumns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'department', header: 'Department', meta: { filterVariant: 'select' } },
  { accessorKey: 'salary', header: 'Salary', meta: { filterVariant: 'number' }, aggregationFn: 'sum' },
  { accessorKey: 'startDate', header: 'Start date', meta: { filterVariant: 'date' } },
  { accessorKey: 'active', header: 'Active', meta: { filterVariant: 'boolean' } },
];

export function makeRows(count: number): Employee[] {
  const departments = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Support'];
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Person ${i + 1}`,
    department: departments[i % departments.length],
    salary: 50000 + ((i * 7919) % 100000),
    startDate: `20${String(10 + (i % 15)).padStart(2, '0')}-0${(i % 9) + 1}-1${i % 9}`,
    active: i % 3 !== 0,
  }));
}

/** Text of each body row's cell for a column, in display order. */
export function columnTexts(container: HTMLElement, columnId: string): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>(`.mdg-tbody [role="gridcell"][data-column-id="${columnId}"]`)).map(
    (el) => el.textContent ?? '',
  );
}
