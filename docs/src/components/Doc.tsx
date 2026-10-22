import { Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { ActionIcon, Box, Code, CopyButton, Group, Loader, Paper, Stack, Table, Tabs, Text, Title, Tooltip } from '@mantine/core';
import { IconCheck, IconCode, IconCopy, IconEye } from '@tabler/icons-react';

export function Page({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <Stack gap="lg" className="docs-prose" maw={1100}>
      <div>
        <Title order={1}>{title}</Title>
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
    <Stack gap="sm" component="section" id={id}>
      <Title order={2} size="h3">
        {title}
      </Title>
      {children}
    </Stack>
  );
}

export function CodeBlock({ code, language = 'tsx' }: { code: string; language?: string }) {
  return (
    <Box className="docs-code">
      <CopyButton value={code.trim()}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copied' : 'Copy'} withinPortal>
            <ActionIcon
              variant="default"
              size="sm"
              onClick={copy}
              aria-label="Copy code"
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
      <Code block data-language={language}>
        {code.trim()}
      </Code>
    </Box>
  );
}

/** Live demo with a "Code" tab showing the exact source file that is running. */
export function Demo({ component: Component, code, title }: { component: ComponentType; code: string; title?: string }) {
  const [tab, setTab] = useState<string | null>('preview');
  return (
    <Paper className="docs-demo" withBorder={false}>
      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Group justify="space-between" mb="sm">
          {title ? <Text fw={600}>{title}</Text> : <span />}
          <Tabs.List>
            <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>
              Preview
            </Tabs.Tab>
            <Tabs.Tab value="code" leftSection={<IconCode size={14} />}>
              Code
            </Tabs.Tab>
          </Tabs.List>
        </Group>
        <Tabs.Panel value="preview">
          <Suspense fallback={<Loader size="sm" />}>
            <Component />
          </Suspense>
        </Tabs.Panel>
        <Tabs.Panel value="code">
          <CodeBlock code={code} />
        </Tabs.Panel>
      </Tabs>
    </Paper>
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
