/**
 * Framework-agnostic implementation of a NestJS-style paginated endpoint:
 *
 *   GET /api/employees?page=1&pageSize=25&sort=salary:desc,name:asc&search=ada&filter={...}
 *   → { data: Employee[], meta: { total, page, pageSize, pageCount } }
 *
 * In a NestJS app this logic lives in a service and is called from a controller
 * (see `nest-controller.example.ts`). With a database you would translate the
 * filter model into SQL / an ORM query instead of filtering in memory.
 */
import { applyFilterModel, createOperatorRegistry, type FilterGroup } from '@kvmb/react-data-grid';
import { generateEmployees, type Employee } from '../data';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; pageCount: number };
}

const registry = createOperatorRegistry();

function readField(row: Employee, field: string): unknown {
  // Column ids use `_` for nested accessors (`location.city` → `location_city`).
  if (field === 'location_city') return row.location.city;
  if (field === 'location_country') return row.location.country;
  return (row as unknown as Record<string, unknown>)[field];
}

export function queryEmployees(db: Employee[], params: URLSearchParams): Paginated<Employee> {
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(params.get('pageSize') ?? 25)));
  const search = (params.get('search') ?? '').toLowerCase();
  let filter: FilterGroup | null;
  try {
    filter = params.get('filter') ? (JSON.parse(params.get('filter')!) as FilterGroup) : null;
  } catch {
    throw Object.assign(new Error('Invalid filter'), { status: 400 });
  }

  let rows = applyFilterModel(db, filter, registry, readField);
  if (search) {
    rows = rows.filter((r) => [r.name, r.email, r.department, r.role, r.location.city].some((v) => v.toLowerCase().includes(search)));
  }
  const sort = (params.get('sort') ?? '')
    .split(',')
    .filter(Boolean)
    .map((s) => {
      const [field, direction] = s.split(':');
      return { field, desc: direction === 'desc' };
    });
  if (sort.length) {
    rows = [...rows].sort((a, b) => {
      for (const { field, desc } of sort) {
        const av = readField(a, field) as string | number;
        const bv = readField(b, field) as string | number;
        if (av === bv) continue;
        const result = av > bv ? 1 : -1;
        return desc ? -result : result;
      }
      return 0;
    });
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), meta: { total, page, pageSize, pageCount: Math.ceil(total / pageSize) } };
}

let database: Employee[] | null = null;
export function getDatabase(): Employee[] {
  database ??= generateEmployees(25_000, 7);
  return database;
}

export function updateEmployee(row: Employee): Employee {
  const db = getDatabase();
  const index = db.findIndex((r) => r.id === row.id);
  if (index < 0) throw Object.assign(new Error('Not found'), { status: 404 });
  db[index] = row;
  return row;
}
