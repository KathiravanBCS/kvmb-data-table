import { DataGrid } from '@kvmb/react-data-grid';
import type { ColumnDef } from '@tanstack/react-table';

type Employee = { id: string; name: string; department: string; salary: number };

const employees: Employee[] = [
  { id: '1', name: 'Ada Lovelace', department: 'Engineering', salary: 145000 },
  { id: '2', name: 'Grace Hopper', department: 'Engineering', salary: 152000 },
  { id: '3', name: 'Ken Thompson', department: 'Operations', salary: 128000 },
  { id: '4', name: 'Hedy Lamarr', department: 'Research', salary: 133000 },
  { id: '5', name: 'Alan Turing', department: 'Research', salary: 149000 },
];

const columns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'department', header: 'Department' },
  { accessorKey: 'salary', header: 'Salary', meta: { filterVariant: 'number' } },
];

export default function BasicDemo() {
  return <DataGrid<Employee> data={employees} columns={columns} aria-label="Employees" />;
}
