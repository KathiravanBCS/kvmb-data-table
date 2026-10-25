import { useEffect, useState } from 'react';
import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import { IconListSearch } from '@tabler/icons-react';

interface TocItem {
  id: string;
  label: string;
}

/** Height of the sticky header plus breathing room, used for scroll offsets. */
const HEADER_OFFSET = 80;

/**
 * "Table of contents" column like mantine.dev: lists the page's section headings
 * (elements with `data-toc`) and highlights the one currently being read.
 * The docs use hash routing, so items scroll with JS instead of `#id` links.
 */
export function TableOfContents({ pageKey }: { pageKey: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>('main [data-toc]'));
    setItems(headings.map((h) => ({ id: h.id, label: h.dataset.toc ?? h.textContent ?? '' })));

    const update = () => {
      let current: string | null = headings[0]?.id ?? null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top - HEADER_OFFSET <= 1) current = h.id;
      }
      // At the bottom of the page, the last section is the one being read.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && headings.length) {
        current = headings[headings.length - 1].id;
      }
      setActive(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pageKey]);

  if (items.length < 2) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET + 8, behavior: reduce ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  };

  return (
    <Box component="nav" className="docs-toc" aria-label="Table of contents">
      <Group gap={8} mb="sm">
        <IconListSearch size={18} stroke={1.5} aria-hidden />
        <Text fw={600} size="sm">
          Table of contents
        </Text>
      </Group>
      <div className="docs-toc-list">
        {items.map((item) => (
          <UnstyledButton
            key={item.id}
            className="docs-toc-link"
            data-active={item.id === active || undefined}
            aria-current={item.id === active ? 'location' : undefined}
            onClick={() => scrollTo(item.id)}
          >
            {item.label}
          </UnstyledButton>
        ))}
      </div>
    </Box>
  );
}
