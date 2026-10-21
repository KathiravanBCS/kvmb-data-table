import type { FilterCondition, FilterValue } from '../../features/filtering/filter.types';
import type { FilterOperatorRegistry } from '../../features/filtering/filter.operators';

function formatValue(value: FilterValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== '').join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** Human-readable summary of a condition, e.g. `Salary between 10 – 20`. */
export function describeCondition(
  condition: FilterCondition,
  registry: FilterOperatorRegistry,
  fieldLabel: string,
): string {
  const def = registry.get(condition.operator);
  const opLabel = def?.label ?? condition.operator;
  if (!def || def.input === 'none') return `${fieldLabel} ${opLabel.toLowerCase()}`;
  if (def.input === 'numberRange' || def.input === 'dateRange') {
    const [a, b] = Array.isArray(condition.value) ? condition.value : [null, null];
    const from = a === null || a === undefined || a === '' ? '…' : String(a);
    const to = b === null || b === undefined || b === '' ? '…' : String(b);
    return `${fieldLabel} ${opLabel.toLowerCase()} ${from} – ${to}`;
  }
  const isSymbol = /^[^a-zA-Z]+$/.test(opLabel);
  return `${fieldLabel} ${isSymbol ? opLabel : opLabel.toLowerCase()} ${formatValue(condition.value)}`;
}
