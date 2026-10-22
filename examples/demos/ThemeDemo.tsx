import { useState } from 'react';
import {
  ColorSwatch,
  Group,
  MantineProvider,
  SegmentedControl,
  Stack,
  Switch,
  createTheme,
  useComputedColorScheme,
  useMantineColorScheme,
  type MantineRadius,
} from '@mantine/core';
import { DataGrid, type GridDensity } from '@kvmb/react-data-grid';
import { employeeColumns } from '../columns';
import { generateEmployees } from '../data';

const data = generateEmployees(80);
const COLORS = ['blue', 'teal', 'grape', 'orange', 'red'];

export default function ThemeDemo() {
  const { toggleColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme('light');
  const [primaryColor, setPrimaryColor] = useState('teal');
  const [radius, setRadius] = useState<MantineRadius>('md');
  const [density, setDensity] = useState<GridDensity>('standard');

  // A nested provider re-themes just this subtree; the grid reads Mantine CSS variables only.
  const theme = createTheme({
    primaryColor,
    defaultRadius: radius,
    fontFamily: 'Georgia, serif',
    components: { DataGrid: { defaultProps: { striped: true } } },
  });

  return (
    <Stack>
      <Group>
        <Switch label="Dark mode" checked={colorScheme === 'dark'} onChange={toggleColorScheme} />
        <Group gap={6}>
          {COLORS.map((c) => (
            <ColorSwatch
              key={c}
              component="button"
              color={`var(--mantine-color-${c}-filled)`}
              onClick={() => setPrimaryColor(c)}
              aria-label={`Primary color ${c}`}
              aria-pressed={primaryColor === c}
            />
          ))}
        </Group>
        <SegmentedControl size="xs" value={String(radius)} onChange={(v) => setRadius(v)} data={['xs', 'md', 'xl']} />
        <SegmentedControl
          size="xs"
          value={density}
          onChange={(v) => setDensity(v as GridDensity)}
          data={['compact', 'standard', 'comfortable']}
        />
      </Group>
      {/* Nested provider scoped to `.theme-demo`: its CSS variables only apply inside that element. */}
      <MantineProvider
        theme={theme}
        cssVariablesSelector=".theme-demo"
        forceColorScheme={colorScheme}
        getRootElement={() => document.querySelector<HTMLElement>('.theme-demo') ?? undefined}
      >
        <div className="theme-demo" data-mantine-color-scheme={colorScheme}>
          <DataGrid
            data={data}
            columns={employeeColumns}
            enableRowSelection
            enableFiltering
            enableEditing
            density={density}
            onDensityChange={setDensity}
            defaultRowSelection={{ '2': true, '3': true }}
            height={400}
            aria-label="Themed employees"
          />
        </div>
      </MantineProvider>
    </Stack>
  );
}
