import { List, Text } from '@mantine/core';
import { CodeBlock, Demo, Page, Section } from '../components/Doc';

import ResourceWorkloadDemo from '../../../examples/demos/ResourceWorkloadDemo';
import resourceWorkloadCode from '../../../examples/demos/ResourceWorkloadDemo.tsx?raw';
import InvoiceAgingDemo from '../../../examples/demos/InvoiceAgingDemo';
import invoiceAgingCode from '../../../examples/demos/InvoiceAgingDemo.tsx?raw';
import PartnerSummaryDemo from '../../../examples/demos/PartnerSummaryDemo';
import partnerSummaryCode from '../../../examples/demos/PartnerSummaryDemo.tsx?raw';
import StatusByMonthDemo from '../../../examples/demos/StatusByMonthDemo';
import statusByMonthCode from '../../../examples/demos/StatusByMonthDemo.tsx?raw';
import recipesDataCode from '../../../examples/recipes.ts?raw';

export function RecipesPage() {
  return (
    <Page
      title="Table recipes"
      intro="Four reporting layouts built only from the public API: master/detail rows, grouped sections with totals, hierarchical financial summaries and grouped column headers."
    >
      <Section title="Master / detail: resource workload">
        <Text size="sm">
          <code>renderDetailPanel</code> adds an expand column and renders any content in a full-width panel below the row. Here each panel
          holds an engagement card with a nested grid that groups tasks by service item. Over-allocated people are highlighted with{' '}
          <code>meta.cellStyle</code>.
        </Text>
        <Demo component={ResourceWorkloadDemo} code={resourceWorkloadCode} />
        <List size="sm">
          <List.Item>
            Control which rows can expand with <code>getRowCanExpand</code>, and which are open with <code>expanded</code> /{' '}
            <code>defaultExpanded</code>.
          </List.Item>
          <List.Item>
            Panels are measured, so they work with virtualization. Keyboard: <code>Enter</code> on the expand cell toggles the panel, and
            nested grids keep their own keyboard navigation.
          </List.Item>
        </List>
      </Section>

      <Section title="Grouped sections: invoice aging">
        <Text size="sm">
          Client-side grouping by an aging bucket, a custom <code>sortingFn</code> to keep the bucket order, and a{' '}
          <code>renderGroupHeader</code> with a count badge and the section total. The toolbar has expand/collapse all, CSV/Excel export and{' '}
          <b>Copy to clipboard</b> (tab-separated, pastes into Excel as cells).
        </Text>
        <Demo component={InvoiceAgingDemo} code={invoiceAgingCode} />
      </Section>

      <Section title="Hierarchy with grouped headers: partner summary">
        <Text size="sm">
          Server-shaped tree data (partner → customer → proposal) through <code>getSubRows</code>. The first column shows the tree expanders
          and indentation (change it with <code>treeColumnId</code>). A column group spans the currency columns, and columns without a group
          span both header rows.
        </Text>
        <Demo component={PartnerSummaryDemo} code={partnerSummaryCode} />
        <List size="sm">
          <List.Item>
            Parent rows already carry their children&apos;s totals, so the footer uses <code>footerAggregation: &apos;roots&apos;</code> to
            add up top-level rows only. <code>true</code> (or <code>&apos;leaves&apos;</code>) adds up rows without children.
          </List.Item>
          <List.Item>
            Highlight a column with <code>meta.cellStyle</code>, <code>meta.headerStyle</code> and <code>meta.footerStyle</code> (or the
            matching class name options).
          </List.Item>
          <List.Item>Exports and the clipboard include every level of the tree, parents before their children.</List.Item>
        </List>
      </Section>

      <Section title="Grouped columns: status by month">
        <Text size="sm">
          Two column groups (<i>Status count</i>, <i>Status amount</i>) with color-coded values and a totals footer computed by{' '}
          <code>meta.footerAggregation</code>.
        </Text>
        <Demo component={StatusByMonthDemo} code={statusByMonthCode} />
      </Section>

      <Section title="Expanding from your own buttons">
        <CodeBlock
          code={`const apiRef = useRef<DataGridApi<Row>>(null);

<Button onClick={() => apiRef.current?.expandAll()}>Expand all</Button>
<Button onClick={() => apiRef.current?.collapseAll()}>Collapse all</Button>
<Button onClick={() => apiRef.current?.copyToClipboard({ rows: 'filtered' })}>Copy table</Button>

<DataGrid apiRef={apiRef} … />`}
        />
      </Section>

      <Section title="Sample data">
        <CodeBlock code={recipesDataCode} language="ts" expandable />
      </Section>
    </Page>
  );
}
