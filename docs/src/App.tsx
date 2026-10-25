import { useEffect, useState, type ComponentType } from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Text,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBrandGithub, IconMoon, IconSun, IconTable } from '@tabler/icons-react';
import { GettingStartedPage } from './pages/GettingStarted';
import {
  AccessibilityPage,
  ColumnManagementPage,
  ColumnsPage,
  DragDropPage,
  EditingPage,
  ExportPage,
  FilteringPage,
  GroupingPage,
  PaginationPage,
  PersistencePage,
  SelectionPage,
  ServerSidePage,
  SortingPage,
  ThemingPage,
  VirtualizationPage,
} from './pages/FeaturePages';
import { ApiPage, MigrationPage, TroubleshootingPage } from './pages/ReferencePages';
import { TableOfContents } from './components/TableOfContents';

interface PageEntry {
  slug: string;
  label: string;
  component: ComponentType;
}

const sections: { label: string; pages: PageEntry[] }[] = [
  { label: 'Introduction', pages: [{ slug: 'getting-started', label: 'Getting started', component: GettingStartedPage }] },
  {
    label: 'Features',
    pages: [
      { slug: 'columns', label: 'Column definitions', component: ColumnsPage },
      { slug: 'sorting', label: 'Sorting', component: SortingPage },
      { slug: 'filtering', label: 'Advanced filtering', component: FilteringPage },
      { slug: 'pagination', label: 'Pagination', component: PaginationPage },
      { slug: 'editing', label: 'Inline editing', component: EditingPage },
      { slug: 'grouping', label: 'Grouping & aggregation', component: GroupingPage },
      { slug: 'virtualization', label: 'Virtualization', component: VirtualizationPage },
      { slug: 'selection', label: 'Row selection', component: SelectionPage },
      { slug: 'column-management', label: 'Column management', component: ColumnManagementPage },
      { slug: 'drag-and-drop', label: 'Drag & drop', component: DragDropPage },
      { slug: 'export', label: 'CSV & Excel export', component: ExportPage },
      { slug: 'server-side', label: 'Server-side data', component: ServerSidePage },
      { slug: 'theming', label: 'Mantine themes', component: ThemingPage },
      { slug: 'persistence', label: 'State persistence', component: PersistencePage },
      { slug: 'accessibility', label: 'Accessibility', component: AccessibilityPage },
    ],
  },
  {
    label: 'Reference',
    pages: [
      { slug: 'api', label: 'API reference', component: ApiPage },
      { slug: 'migration', label: 'Migration guides', component: MigrationPage },
      { slug: 'troubleshooting', label: 'Troubleshooting', component: TroubleshootingPage },
    ],
  },
];

const allPages = sections.flatMap((s) => s.pages);
const readSlug = () => window.location.hash.replace(/^#\/?/, '') || 'getting-started';

export function App() {
  const [slug, setSlug] = useState(readSlug);
  const [opened, { toggle, close }] = useDisclosure();
  const { toggleColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');

  useEffect(() => {
    const onHash = () => {
      setSlug(readSlug());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const page = allPages.find((p) => p.slug === slug) ?? allPages[0];
  const Current = page.component;

  useEffect(() => {
    document.title = `${page.label} · React Data Grid for Mantine`;
  }, [page.label]);

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="xl">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <IconTable size={22} aria-hidden />
            <Title order={4} component="span">
              @kvmb/react-data-grid
            </Title>
            <Badge variant="default" radius="sm" visibleFrom="xs">
              v0.1.0
            </Badge>
          </Group>
          <Group gap="xs">
            <Tooltip label={`Switch to ${scheme === 'dark' ? 'light' : 'dark'} mode`}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
                data-testid="color-scheme-toggle"
              >
                {scheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              component="a"
              href="https://github.com/KathiravanBCS/kvmb-data-table"
              variant="default"
              size="lg"
              aria-label="GitHub repository"
            >
              <IconBrandGithub size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar aria-label="Documentation" className="docs-navbar">
        <ScrollArea type="hover" scrollbarSize={6} px="md" py="sm" h="100%">
          {sections.map((section) => (
            <div key={section.label}>
              <Text fw={700} size="sm" px="sm" mt="lg" mb={6} className="docs-nav-section">
                {section.label}
              </Text>
              {section.pages.map((p) => (
                <NavLink
                  key={p.slug}
                  href={`#/${p.slug}`}
                  label={p.label}
                  active={p.slug === page.slug}
                  className="docs-nav-link"
                  onClick={close}
                  aria-current={p.slug === page.slug ? 'page' : undefined}
                />
              ))}
            </div>
          ))}
        </ScrollArea>
      </AppShell.Navbar>
      <AppShell.Main>
        <div className="docs-layout">
          <div className="docs-content">
            <Current key={page.slug} />
          </div>
          <TableOfContents pageKey={page.slug} />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
