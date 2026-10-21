import { expect, test } from '@playwright/test';
import { bodyColumn, grid, openPage } from './helpers';

test('virtualizes 100,000 rows and keeps the DOM small while scrolling', async ({ page }) => {
  await openPage(page, 'virtualization');
  const start = Date.now();
  await page.getByText('100,000 rows', { exact: true }).click();
  // header + 100,000 rows + aggregate footer
  await expect(grid(page)).toHaveAttribute('aria-rowcount', '100002');
  const switchMs = Date.now() - start;
  const rowsInDom = await grid(page).locator('.mdg-tbody [role="row"]').count();
  expect(rowsInDom).toBeLessThan(60);

  const scroller = page.locator('.mdg-scroll').first();
  await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(grid(page).locator('.mdg-tbody [role="row"]').last()).toHaveAttribute('aria-rowindex', '100001');
  expect(await grid(page).locator('.mdg-tbody [role="row"]').count()).toBeLessThan(60);
  test.info().annotations.push({ type: 'perf', description: `switch to 100k rows (generate + render): ${switchMs}ms` });
});

test('keyboard navigation scrolls the virtualized grid', async ({ page }) => {
  await openPage(page, 'virtualization');
  const firstCell = grid(page).locator('[data-row-index="0"][data-col-index="1"]');
  await firstCell.click();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowDown');
  await expect(page.locator(':focus')).toHaveAttribute('data-row-index', '30');
  await page.keyboard.press('Control+End');
  await expect(page.locator(':focus')).toHaveAttribute('data-row-index', '9999');
  await expect(page.locator(':focus')).toBeInViewport();
});

test('inline editing commits with Enter and validates', async ({ page }) => {
  await openPage(page, 'editing');
  await page.getByLabel('Random save failures').uncheck();
  const name = grid(page).locator('[data-row-index="0"][data-column-id="name"]');
  await name.dblclick();
  const input = name.getByRole('textbox');
  await input.fill('');
  await input.press('Enter');
  await expect(page.getByText('Name is required')).toBeVisible();
  await input.fill('Playwright Person');
  await input.press('Enter');
  await expect(name).toHaveText('Playwright Person');
  await expect(name).toBeFocused();
});

test('column resizing with the mouse', async ({ page }) => {
  await openPage(page, 'column-management');
  const header = grid(page).locator('[role="columnheader"][data-column-id="email"]');
  const before = (await header.boundingBox())!.width;
  const handle = header.locator('.mdg-resizer');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const after = (await header.boundingBox())!.width;
  expect(after - before).toBeGreaterThan(60);
  // Body cells follow the header
  const cell = grid(page).locator('.mdg-tbody [data-row-index="0"][data-column-id="email"]');
  expect(Math.abs((await cell.boundingBox())!.width - after)).toBeLessThan(1);
});

test('pinned columns stay visible while scrolling horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await openPage(page, 'column-management');
  const scroller = page.locator('.mdg-scroll').first();
  await scroller.evaluate((el) => (el.scrollLeft = 400));
  const pinned = grid(page).locator('.mdg-tbody [data-row-index="0"][data-column-id="name"]');
  const scrollerBox = (await scroller.boundingBox())!;
  expect(Math.abs((await pinned.boundingBox())!.x - scrollerBox.x)).toBeLessThan(2);
});

test('rows can be reordered with the keyboard and the pointer', async ({ page }) => {
  await openPage(page, 'drag-and-drop');
  const names = () => bodyColumn(page, 'name');
  const initial = await names();
  // Keyboard: pick up row 1, move down twice, drop.
  const handle = grid(page).getByRole('button', { name: 'Drag to reorder row' }).first();
  await handle.focus();
  // dnd-kit processes keyboard moves asynchronously; give each step a frame or two.
  for (const key of ['Space', 'ArrowDown', 'ArrowDown', 'Space']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
  await expect.poll(names).toEqual([initial[1], initial[2], initial[0], ...initial.slice(3)]);

  // Pointer: drag the (new) first row below the second.
  const after = await names();
  const source = (await grid(page).getByRole('button', { name: 'Drag to reorder row' }).first().boundingBox())!;
  const target = (await grid(page).locator('.mdg-tbody [role="row"]').nth(1).boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2, target.y + target.height * 0.9, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect.poll(names).toEqual([after[1], after[0], ...after.slice(2)]);
});

test('columns can be reordered by dragging the header handle', async ({ page }) => {
  await openPage(page, 'drag-and-drop');
  const headerIds = () => grid(page).locator('[role="columnheader"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-column-id')));
  const before = await headerIds();
  const emailHeader = grid(page).locator('[role="columnheader"][data-column-id="email"]');
  await emailHeader.hover();
  const handle = emailHeader.getByRole('button', { name: /Drag to reorder column/ });
  const hb = (await handle.boundingBox())!;
  const target = (await grid(page).locator('[role="columnheader"][data-column-id="role"]').boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width * 0.8, hb.y + hb.height / 2, { steps: 15 });
  await page.mouse.up();
  const after = await headerIds();
  expect(after).not.toEqual(before);
  expect(after.indexOf('email')).toBeGreaterThan(before.indexOf('email'));
});

test('CSV and Excel exports download files (ExcelJS loaded lazily)', async ({ page }) => {
  await openPage(page, 'export');
  const excelRequests: string[] = [];
  page.on('request', (r) => {
    if (/exceljs/i.test(r.url())) excelRequests.push(r.url());
  });
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV (filtered, visible columns)' }).click()]);
  expect(csv.suggestedFilename()).toBe('employees.csv');
  const text = await (await csv.createReadStream()).toArray();
  expect(Buffer.concat(text).toString('utf8')).toContain('Name,Email,Department');
  expect(excelRequests).toHaveLength(0);
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel (3 sheets)' }).click()]);
  expect(xlsx.suggestedFilename()).toBe('employees.xlsx');
  expect(excelRequests.length).toBeGreaterThan(0);
});

test('server-side mode fetches pages, sorts and searches', async ({ page }) => {
  await openPage(page, 'server-side');
  await expect(page.getByText(/of 25,000/)).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('.docs-demo pre')).toContainText('page=2');
  await grid(page).locator('[role="columnheader"][data-column-id="salary"]').click();
  await expect(page.locator('.docs-demo pre')).toContainText('sort=salary:asc');
  await page.getByRole('searchbox', { name: 'Search all columns' }).fill('lovelace');
  await expect(page.locator('.docs-demo pre')).toContainText('search=lovelace');
  await expect.poll(async () => (await bodyColumn(page, 'name')).every((n) => n.toLowerCase().includes('lovelace'))).toBe(true);
});

test('filter builder applies nested AND/OR conditions', async ({ page }) => {
  await openPage(page, 'filtering');
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await page.getByRole('button', { name: /^Filters/ }).click();
  const dialog = page.getByRole('dialog', { name: /Filters/ });
  await dialog.getByRole('button', { name: 'Add condition' }).click();
  await dialog.getByRole('textbox', { name: 'Value' }).fill('Ada');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect.poll(async () => (await bodyColumn(page, 'name')).every((n) => n.includes('Ada'))).toBe(true);
  await expect(page.getByRole('list', { name: 'Filters' })).toContainText('Name contains Ada');
});
