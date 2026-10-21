import { Group, MultiSelect, NumberInput, Select, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { FilterOption, FilterValue, FilterValueInputKind } from '../../features/filtering/filter.types';

export interface FilterValueInputProps {
  kind: FilterValueInputKind;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
  options: readonly FilterOption[];
  label: string;
  minLabel: string;
  maxLabel: string;
  autoFocus?: boolean;
  /** Mantine dropdowns render in portals; this class marks them as part of the filter UI. */
  dropdownClassName?: string;
  /** Render dropdowns in a portal. Set `false` when nested inside a Popover/Menu. Default `true`. */
  withinPortal?: boolean;
}

const toNum = (v: string | number): number | null => (v === '' ? null : typeof v === 'number' ? v : Number(v));

/** Renders the value control for a filter operator (text, number, range, date, select...). */
export function FilterValueInput({
  kind,
  value,
  onChange,
  options,
  label,
  minLabel,
  maxLabel,
  autoFocus,
  dropdownClassName,
  withinPortal = true,
}: FilterValueInputProps) {
  const range = Array.isArray(value) ? value : [null, null];
  const data = options as FilterOption[];
  switch (kind) {
    case 'none':
      return null;
    case 'number':
      return (
        <NumberInput
          size="xs"
          aria-label={label}
          placeholder={label}
          value={typeof value === 'number' ? value : ''}
          onChange={(v) => onChange(toNum(v))}
          autoFocus={autoFocus}
        />
      );
    case 'numberRange':
      return (
        <Group gap={4} wrap="nowrap" grow>
          <NumberInput
            size="xs"
            aria-label={`${label} ${minLabel}`}
            placeholder={minLabel}
            value={typeof range[0] === 'number' ? range[0] : ''}
            onChange={(v) => onChange([toNum(v), (range[1] as number | null) ?? null])}
            autoFocus={autoFocus}
          />
          <NumberInput
            size="xs"
            aria-label={`${label} ${maxLabel}`}
            placeholder={maxLabel}
            value={typeof range[1] === 'number' ? range[1] : ''}
            onChange={(v) => onChange([(range[0] as number | null) ?? null, toNum(v)])}
          />
        </Group>
      );
    case 'date':
      return (
        <DatePickerInput
          size="xs"
          aria-label={label}
          placeholder={label}
          value={typeof value === 'string' && value ? value : null}
          onChange={(v) => onChange(v ?? null)}
          valueFormat="YYYY-MM-DD"
          clearable
          popoverProps={{ withinPortal, classNames: dropdownClassName ? { dropdown: dropdownClassName } : undefined }}
        />
      );
    case 'dateRange':
      return (
        <DatePickerInput
          type="range"
          size="xs"
          aria-label={label}
          placeholder={label}
          value={[(range[0] as string | null) ?? null, (range[1] as string | null) ?? null]}
          onChange={(v) => onChange([v[0] ?? null, v[1] ?? null])}
          valueFormat="YYYY-MM-DD"
          clearable
          allowSingleDateInRange
          popoverProps={{ withinPortal, classNames: dropdownClassName ? { dropdown: dropdownClassName } : undefined }}
        />
      );
    case 'select':
      return (
        <Select
          size="xs"
          aria-label={label}
          placeholder={label}
          data={data}
          value={typeof value === 'string' ? value : value === null || value === undefined ? null : String(value)}
          onChange={(v) => onChange(v)}
          searchable
          clearable
          comboboxProps={{ withinPortal, classNames: dropdownClassName ? { dropdown: dropdownClassName } : undefined }}
        />
      );
    case 'multiSelect':
      return (
        <MultiSelect
          size="xs"
          aria-label={label}
          placeholder={Array.isArray(value) && value.length ? undefined : label}
          data={data}
          value={Array.isArray(value) ? value.map(String) : value === null || value === undefined || value === '' ? [] : [String(value)]}
          onChange={(v) => onChange(v)}
          searchable
          clearable
          comboboxProps={{ withinPortal, classNames: dropdownClassName ? { dropdown: dropdownClassName } : undefined }}
        />
      );
    case 'text':
    default:
      return (
        <TextInput
          size="xs"
          aria-label={label}
          placeholder={label}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.currentTarget.value)}
          autoFocus={autoFocus}
        />
      );
  }
}
