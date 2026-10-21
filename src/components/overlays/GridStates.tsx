import { isValidElement, type CSSProperties, type ReactNode } from 'react';
import { Alert, Button, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconDatabaseOff } from '@tabler/icons-react';
import type { DataGridLabels } from '../../core/grid.defaults';
import type { ColumnLayoutItem } from '../../features/pinning/pinning';
import { getCellLayoutStyle } from '../../features/pinning/pinning';

export function EmptyState({ filtered, labels, className, style }: { filtered: boolean; labels: DataGridLabels; className: string; style?: CSSProperties }) {
  return (
    <div className={className} style={style} role="row">
      <div role="gridcell" className="mdg-state-cell">
        <Stack align="center" gap={4} py="xl">
          <IconDatabaseOff size={28} stroke={1.5} className="mdg-state-icon" aria-hidden />
          <Text size="sm" className="mdg-muted">
            {filtered ? labels.noResults : labels.noRows}
          </Text>
        </Stack>
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  labels,
  onRetry,
  className,
  style,
}: {
  error: ReactNode | Error;
  labels: DataGridLabels;
  onRetry?: () => void;
  className: string;
  style?: CSSProperties;
}) {
  const message = error instanceof Error ? error.message : isValidElement(error) || typeof error !== 'object' ? error : String(error);
  return (
    <div className={className} style={style} role="row">
      <div role="gridcell" className="mdg-state-cell">
        <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} title={labels.errorTitle} m="md" role="alert">
          <Stack gap="xs" align="flex-start">
            {message !== true && message !== null && message !== undefined && <Text size="sm">{message}</Text>}
            {onRetry && (
              <Button size="xs" variant="light" color="red" onClick={onRetry}>
                {labels.retry}
              </Button>
            )}
          </Stack>
        </Alert>
      </div>
    </div>
  );
}

export function SkeletonRows({
  count,
  layout,
  fill,
  rowClassName,
  cellClassName,
}: {
  count: number;
  layout: ColumnLayoutItem[];
  fill: boolean;
  rowClassName: string;
  cellClassName: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, r) => (
        <div key={r} role="row" className={rowClassName} aria-hidden data-skeleton="">
          {layout.map((item) => (
            <div key={item.id} role="gridcell" className={cellClassName} style={getCellLayoutStyle(item, fill)} data-pinned={item.pinned || undefined}>
              <Skeleton height={10} radius="sm" width={`${50 + ((r * 7 + item.size) % 40)}%`} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
