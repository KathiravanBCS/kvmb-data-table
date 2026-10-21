import { DataGrid } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const data = generateEmployees(1234);

export default function PaginationDemo() {
  return (
    <DataGrid
      data={data}
      columns={employeeColumns}
      enablePagination
      enableFiltering
      pageSizeOptions={[10, 25, 50, 100]}
      defaultPagination={{ pageSize: 10 }}
      aria-label="Paginated employees"
    />
  );
}
