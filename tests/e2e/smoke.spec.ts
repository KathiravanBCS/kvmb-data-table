import { expect, test } from '@playwright/test';
import { openPage } from './helpers';

const slugs = [
  'getting-started',
  'columns',
  'sorting',
  'filtering',
  'pagination',
  'editing',
  'grouping',
  'recipes',
  'virtualization',
  'selection',
  'column-management',
  'drag-and-drop',
  'export',
  'server-side',
  'theming',
  'persistence',
  'accessibility',
  'api',
  'migration',
  'troubleshooting',
];

for (const slug of slugs) {
  test(`docs page "${slug}" renders without runtime errors`, async ({ page }) => {
    const errors = await openPage(page, slug);
    await page.waitForTimeout(400);
    expect(errors).toEqual([]);
  });
}
