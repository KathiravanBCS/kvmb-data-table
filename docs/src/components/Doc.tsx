import { Suspense, type ComponentType, type ReactNode } from 'react';
import { Box, Code, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';

/** URL-safe id for a heading, used by the table of contents. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function Page({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <Stack gap="xl" className="docs-prose">
      <div>
        <Title order={1} className="docs-page-title">
          {title}
        </Title>
        {intro && (
          <Text c="dimmed" mt="xs" size="lg">
            {intro}
          </Text>
        )}
      </div>
      {children}
    </Stack>
  );
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <Stack gap="sm" component="section">
      <Title order={2} size="h3" id={id ?? slugify(title)} data-toc={title} className="docs-section-title">
        {title}
      </Title>
      {children}
    </Stack>
  );
}

/** Long snippets start collapsed with an "Expand code" button, like mantine.dev. */
const COLLAPSE_AFTER_LINES = 18;

export function CodeBlock({ code, language = 'tsx', expandable }: { code: string; language?: string; expandable?: boolean }) {
  const trimmed = code.trim();
  const long = expandable ?? trimmed.split('\n').length > COLLAPSE_AFTER_LINES;
  return (
    <CodeHighlight
      className="docs-code"
      code={trimmed}
      language={language}
      radius="md"
      withBorder
      withExpandButton={long}
      defaultExpanded={!long}
      maxCollapsedHeight={320}
      expandCodeLabel="Expand code"
      collapseCodeLabel="Collapse code"
    />
  );
}

/** Live demo with the exact source file that is running shown underneath it. */
export function Demo({ component: Component, code, title }: { component: ComponentType; code: string; title?: string }) {
  return (
    <Box className="docs-demo">
      {title && (
        <Text fw={600} px="md" pt="md">
          {title}
        </Text>
      )}
      <div className="docs-demo-preview">
        <Suspense fallback={<Loader size="sm" />}>
          <Component />
        </Suspense>
      </div>
      <CodeHighlight
        className="docs-demo-code"
        code={code.trim()}
        language="tsx"
        withExpandButton
        defaultExpanded={false}
        maxCollapsedHeight={200}
        expandCodeLabel="Show code"
        collapseCodeLabel="Hide code"
      />
    </Box>
  );
}

export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: ReactNode;
}

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <Table.ScrollContainer minWidth={720}>
      <Table striped withTableBorder verticalSpacing={6} fz="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={210}>Prop</Table.Th>
            <Table.Th w={280}>Type</Table.Th>
            <Table.Th w={110}>Default</Table.Th>
            <Table.Th>Description</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.name}>
              <Table.Td>
                <Code>{r.name}</Code>
              </Table.Td>
              <Table.Td>
                <Code fz="xs">{r.type}</Code>
              </Table.Td>
              <Table.Td>{r.default ? <Code fz="xs">{r.default}</Code> : '–'}</Table.Td>
              <Table.Td>{r.description}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <Code fz="xs">{children}</Code>;
}
