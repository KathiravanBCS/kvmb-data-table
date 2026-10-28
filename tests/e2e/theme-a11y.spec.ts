import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { grid, openPage } from './helpers';

const pages = ['getting-started', 'filtering', 'editing', 'grouping', 'recipes', 'selection', 'theming'];

for (const slug of pages) {
  test(`axe: "${slug}" has no WCAG A/AA violations inside the grid`, async ({ page }) => {
    await openPage(page, slug);
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).include('.mdg-root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

test('grid colors follow the Mantine color scheme and update live', async ({ page }) => {
  await openPage(page, 'getting-started');
  const header = grid(page).locator('.mdg-header-row');
  const read = () => header.evaluate((el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor);
  const scheme = () => page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme'));
  const before = await read();
  const beforeScheme = await scheme();
  await page.getByTestId('color-scheme-toggle').click();
  await expect.poll(scheme).not.toBe(beforeScheme);
  await expect.poll(read).not.toBe(before);
});

test('primary color, radius and font from a nested theme apply to the grid', async ({ page }) => {
  await openPage(page, 'theming');
  const root = page.locator('.theme-demo .mdg-root');
  const selectedRow = page.locator('.theme-demo .mdg-tbody [role="row"][aria-selected="true"]').first();
  const bg = () => selectedRow.evaluate((el) => getComputedStyle(el).backgroundImage);
  const teal = await bg();
  await page.getByRole('button', { name: 'Primary color grape' }).click();
  await expect.poll(bg).not.toBe(teal);
  expect(await root.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Georgia');
  await page.getByText('compact', { exact: true }).click();
  await expect(root).toHaveAttribute('data-density', 'compact');
});
