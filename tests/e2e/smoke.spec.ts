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

test('sidebar sections collapse and the navigation hides with the toggle or Ctrl+B', async ({ page }) => {
  await openPage(page, 'sorting');
  const nav = page.getByRole('navigation', { name: 'Documentation' });
  const reference = nav.getByRole('button', { name: 'Reference' });
  await expect(reference).toHaveAttribute('aria-expanded', 'true');
  await reference.click();
  await expect(reference).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link', { name: 'API reference' })).toHaveCount(0);
  // The section holding the current page cannot stay hidden behind a collapse.
  await nav.getByRole('button', { name: 'Features' }).click();
  await page.goto('/#/api');
  await expect(reference).toHaveAttribute('aria-expanded', 'true');

  const toggle = page.getByTestId('nav-toggle');
  await expect(toggle).toHaveAccessibleName('Hide navigation');
  await toggle.click();
  await expect(nav).not.toBeInViewport();
  await expect(toggle).toHaveAccessibleName('Show navigation');
  await page.keyboard.press('Control+b');
  await expect(nav).toBeInViewport();
});
