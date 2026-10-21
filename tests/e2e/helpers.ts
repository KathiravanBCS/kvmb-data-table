import { expect, type Page } from '@playwright/test';

export async function openPage(page: Page, slug: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`/#/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return errors;
}

/** First grid (or treegrid) on the page. */
export function grid(page: Page) {
  return page.locator('[role="grid"], [role="treegrid"]').first();
}

export async function bodyColumn(page: Page, columnId: string) {
  return grid(page).locator(`.mdg-tbody [role="gridcell"][data-column-id="${columnId}"]`).allInnerTexts();
}
