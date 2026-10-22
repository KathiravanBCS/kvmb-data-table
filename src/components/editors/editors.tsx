import { Checkbox, MultiSelect, NumberInput, Select, TextInput } from '@mantine/core';
import { DateInput, DateTimePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import type { RowData } from '@tanstack/react-table';
import type { CellEditorProps } from '../../features/editing/editing.types';

/** Class applied to editor dropdowns rendered in portals, so blur-commit ignores them. */
export const EDITOR_DROPDOWN_CLASS = 'mdg-editor-dropdown';

const inputCommon = (error: string | null, label: string) => ({
  size: 'xs' as const,
  'aria-label': label,
  error: error ? true : undefined,
  'aria-invalid': error ? true : undefined,
  classNames: { root: 'mdg-editor-root' },
});

export function TextEditor<TData extends RowData>({ value, onChange, autoFocus, error, label, pending }: CellEditorProps<TData, unknown>) {
  return (
    <TextInput
      {...inputCommon(error, label)}
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.currentTarget.value)}
      autoFocus={autoFocus}
      disabled={pending}
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}

export function NumberEditor<TData extends RowData>({
  value,
  onChange,
  autoFocus,
  error,
  label,
  pending,
}: CellEditorProps<TData, unknown>) {
  const numeric = typeof value === 'number' ? value : value === null || value === undefined || value === '' ? '' : Number(value);
  return (
    <NumberInput
      {...inputCommon(error, label)}
      value={Number.isNaN(numeric) ? '' : numeric}
      onChange={(v) => onChange(v === '' ? null : typeof v === 'number' ? v : Number(v))}
      autoFocus={autoFocus}
      disabled={pending}
      hideControls
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}

export function SelectEditor<TData extends RowData>({
  value,
  onChange,
  autoFocus,
  error,
  label,
  options,
  pending,
}: CellEditorProps<TData, unknown>) {
  return (
    <Select
      {...inputCommon(error, label)}
      classNames={{ root: 'mdg-editor-root', dropdown: EDITOR_DROPDOWN_CLASS }}
      data={options as { value: string; label: string }[]}
      value={value === null || value === undefined ? null : String(value)}
      onChange={(v) => onChange(v)}
      autoFocus={autoFocus}
      disabled={pending}
      searchable
      allowDeselect={false}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export function MultiSelectEditor<TData extends RowData>({
  value,
  onChange,
  autoFocus,
  error,
  label,
  options,
  pending,
}: CellEditorProps<TData, unknown>) {
  const current = Array.isArray(value) ? value.map(String) : [];
  return (
    <MultiSelect
      {...inputCommon(error, label)}
      classNames={{ root: 'mdg-editor-root', dropdown: EDITOR_DROPDOWN_CLASS }}
      data={options as { value: string; label: string }[]}
      value={current}
      onChange={(v) => onChange(v)}
      autoFocus={autoFocus}
      disabled={pending}
      searchable
      comboboxProps={{ withinPortal: true }}
    />
  );
}

export function CheckboxEditor<TData extends RowData>({ value, onChange, autoFocus, label, pending }: CellEditorProps<TData, unknown>) {
  return (
    <Checkbox
      size="xs"
      aria-label={label}
      checked={value === true}
      onChange={(e) => onChange(e.currentTarget.checked)}
      autoFocus={autoFocus}
      disabled={pending}
    />
  );
}

function toDateString(value: unknown, format: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = dayjs(value as string | Date | number);
  return d.isValid() ? d.format(format) : null;
}

/** Keeps the original value type: `Date` stays `Date`; strings stay ISO strings. */
function fromDateString(next: string | null, previous: unknown, withTime: boolean): unknown {
  if (next === null) return null;
  const d = dayjs(next);
  if (!d.isValid()) return null;
  if (previous instanceof Date) return d.toDate();
  if (typeof previous === 'string' && previous.includes('T')) return d.format('YYYY-MM-DDTHH:mm:ss');
  return withTime ? d.format('YYYY-MM-DD HH:mm:ss') : d.format('YYYY-MM-DD');
}

export function DateEditor<TData extends RowData>({ value, onChange, autoFocus, error, label, pending }: CellEditorProps<TData, unknown>) {
  return (
    <DateInput
      {...inputCommon(error, label)}
      value={toDateString(value, 'YYYY-MM-DD')}
      onChange={(v) => onChange(fromDateString(v, value, false))}
      autoFocus={autoFocus}
      disabled={pending}
      valueFormat="YYYY-MM-DD"
      popoverProps={{ withinPortal: true, classNames: { dropdown: EDITOR_DROPDOWN_CLASS } }}
    />
  );
}

export function DateTimeEditor<TData extends RowData>({
  value,
  onChange,
  autoFocus,
  error,
  label,
  pending,
}: CellEditorProps<TData, unknown>) {
  return (
    <DateTimePicker
      {...inputCommon(error, label)}
      value={toDateString(value, 'YYYY-MM-DD HH:mm:ss')}
      onChange={(v) => onChange(fromDateString(v, value, true))}
      autoFocus={autoFocus}
      disabled={pending}
      valueFormat="YYYY-MM-DD HH:mm"
      popoverProps={{ withinPortal: true, classNames: { dropdown: EDITOR_DROPDOWN_CLASS } }}
    />
  );
}

export const builtInEditors = {
  text: TextEditor,
  number: NumberEditor,
  select: SelectEditor,
  multiSelect: MultiSelectEditor,
  checkbox: CheckboxEditor,
  date: DateEditor,
  datetime: DateTimeEditor,
};
