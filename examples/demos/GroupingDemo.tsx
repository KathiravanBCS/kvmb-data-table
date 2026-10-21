import { DataGrid } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const data = generateEmployees(800);

export default function GroupingDemo() {
  return (
    <DataGrid
      data={data}
      columns={employeeColumns}
      enableGrouping
      enableFiltering
      defaultGrouping={['department', 'role']}
      defaultColumnVisibility={{ email: false, skills: false }}
      showFooter
      height={460}
      aria-label="Employees grouped by department and role"
    />
  );
}
