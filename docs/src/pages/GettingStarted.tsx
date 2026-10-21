import { Alert, List, Table, Text } from '@mantine/core';
import { CodeBlock, Demo, Page, Section } from '../components/Doc';
import BasicDemo from '../../../examples/demos/BasicDemo';
import basicCode from '../../../examples/demos/BasicDemo.tsx?raw';

export function GettingStartedPage() {
  return (
    <Page
      title="Getting started"
      intro="An enterprise React data grid for Mantine, powered by TanStack Table and TanStack Virtual. It reads the theme from your MantineProvider, so it looks like the rest of your app."
    >
      <Section title="Requirements">
        <Table withTableBorder w="fit-content">
          <Table.Tbody>
            <Table.Tr><Table.Td>React</Table.Td><Table.Td>19.x</Table.Td></Table.Tr>
            <Table.Tr><Table.Td>@mantine/core, @mantine/hooks, @mantine/dates</Table.Td><Table.Td>8.3.x</Table.Td></Table.Tr>
            <Table.Tr><Table.Td>dayjs</Table.Td><Table.Td>1.11+</Table.Td></Table.Tr>
            <Table.Tr><Table.Td>exceljs (optional, Excel export only)</Table.Td><Table.Td>4.4+</Table.Td></Table.Tr>
            <Table.Tr><Table.Td>TypeScript (optional)</Table.Td><Table.Td>5.0+ (developed with 6.0)</Table.Td></Table.Tr>
          </Table.Tbody>
        </Table>
      </Section>

      <Section title="Installation">
        <CodeBlock language="bash" code={`npm install @kvmb/react-data-grid @mantine/core @mantine/hooks @mantine/dates dayjs

# optional – only needed for exportToExcel()
npm install exceljs`} />
        <Text>Import the stylesheets once, for example in your app entry. Mantine's styles must come first:</Text>
        <CodeBlock code={`import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@kvmb/react-data-grid/styles.css';`} />
        <Alert variant="light" title="Bundled runtime dependencies">
          <Text size="sm">
            <code>@tanstack/react-table</code>, <code>@tanstack/react-virtual</code>, <code>@dnd-kit/*</code>, <code>@tabler/icons-react</code> and{' '}
            <code>clsx</code> are regular dependencies installed automatically. React, Mantine and dayjs are peer dependencies, so your app keeps a single copy of each.
          </Text>
        </Alert>
      </Section>

      <Section title="Quick start">
        <Text>
          Columns are plain TanStack <code>ColumnDef</code>s. Grid-specific options live in <code>meta</code>, which is fully typed through module augmentation once the package is imported.
        </Text>
        <Demo component={BasicDemo} code={basicCode} />
      </Section>

      <Section title="Feature flags">
        <Text>Every feature is opt-in with a boolean prop, so the default grid stays simple:</Text>
        <CodeBlock code={`<DataGrid<Employee>
  data={employees}
  columns={columns}
  getRowId={(row) => row.id}
  enableSorting          // default: true
  enableFiltering        // column filters, search box, filter builder
  enablePagination
  enableRowSelection
  enableColumnResizing
  enableColumnOrdering
  enableColumnPinning
  enableGrouping
  enableEditing
  enableRowDragging
  enableVirtualization
  enableExport
  height={600}
/>`} />
        <List size="sm">
          <List.Item>
            Always pass <code>getRowId</code> when your rows have an id. Selection, editing and drag-and-drop use row ids to identify rows across data refreshes.
          </List.Item>
          <List.Item>
            <code>height</code> (or <code>maxHeight</code>) gives the grid its own scroll area. Sticky headers and virtualization both need it.
          </List.Item>
        </List>
      </Section>
    </Page>
  );
}
