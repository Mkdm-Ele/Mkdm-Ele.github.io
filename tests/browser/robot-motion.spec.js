import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const motion = '**/models/go2/motions/run.csv';
const csv = await readFile('public/models/go2/motions/run.csv', 'utf8');
async function openRobot(page) {
 await page.route('https://*.supabase.co/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
 await page.goto('/');
 await page.locator('#playground').scrollIntoViewIfNeeded();
 await expect(page.locator('#model-status')).toHaveText('READY TO EXPLORE', { timeout: 25000 });
}
async function seek(page, seconds) {
 await page.locator('#run-progress').evaluate((input, value) => {
  input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
 }, seconds);
 await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('recorded running animates the real model, pauses, seeks, changes speed, loops and exits', async ({ page }) => {
 test.setTimeout(60000);
 const errors = [], requests = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('request', request => { if (request.url().endsWith('/motions/run.csv')) requests.push(request.url()); });
 await openRobot(page);
 expect(requests).toHaveLength(0);
 await page.getByRole('button', { name: 'Run', exact: true }).click();
 await expect(page.locator('#run-controls')).toBeVisible();
 await expect(page.locator('#model-status')).toContainText('RUNNING');
 await expect.poll(() => page.locator('#run-progress').inputValue().then(Number)).toBeGreaterThan(.4);
 await page.getByRole('button', { name: 'Pause running' }).click();
 const paused = await page.locator('#run-progress').inputValue();
 await page.waitForTimeout(250);
 expect(await page.locator('#run-progress').inputValue()).toBe(paused);

 await seek(page, 2);
 const first = await page.locator('#robot-viewport canvas').screenshot();
 await seek(page, 2.2);
 const second = await page.locator('#robot-viewport canvas').screenshot();
 expect(first.equals(second)).toBe(false);
 await expect(page.locator('#run-time')).toHaveText('2.2 / 10.0 s');
 const frozen = await page.locator('#robot-viewport canvas').screenshot();
 expect(frozen.equals(second)).toBe(true);

 await page.locator('#run-speed').selectOption('2');
 await seek(page, 9.9);
 await page.getByRole('button', { name: 'Resume running' }).click();
 await expect.poll(() => page.locator('#run-progress').inputValue().then(Number)).toBeLessThan(2);
 await page.getByRole('button', { name: 'Pause running' }).click();
 await page.locator('.robot-console').screenshot({ path: '.sites-runtime/go2-run-desktop.png' });
 await page.setViewportSize({ width: 390, height: 844 });
 await page.locator('.robot-console').scrollIntoViewIfNeeded();
 await expect(page.locator('#run-speed')).toBeVisible();
 await page.locator('.robot-console').screenshot({ path: '.sites-runtime/go2-run-mobile.png' });
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

 await page.getByRole('button', { name: 'Crouch', exact: true }).click();
 await expect(page.locator('#run-controls')).toBeHidden();
 await expect(page.locator('[data-pose="crouch"]')).toHaveAttribute('aria-pressed', 'true');
 await page.getByRole('button', { name: 'Stand', exact: true }).click();
 await expect(page.locator('#model-status')).toHaveText('READY TO EXPLORE');
 await page.getByRole('button', { name: 'Run', exact: true }).click();
 await expect(page.locator('#run-controls')).toBeVisible();
 expect(requests).toHaveLength(1);
 expect(errors).toEqual([]);
});

test('motion download failures can be retried and leave static poses usable', async ({ page }) => {
 let attempts = 0;
 await page.route(motion, route => {
  attempts++;
  return attempts === 1 ? route.fulfill({ status: 503, body: 'Unavailable' }) :
   route.fulfill({ contentType: 'text/csv', body: csv });
 });
 await openRobot(page);
 await page.locator('[data-pose="run"]').click();
 await expect(page.locator('#model-status')).toContainText('CLICK RUN TO RETRY');
 await expect(page.locator('#run-controls')).toBeHidden();
 await page.locator('[data-pose="crouch"]').click();
 await expect(page.locator('[data-pose="crouch"]')).toHaveAttribute('aria-pressed', 'true');
 await page.locator('[data-pose="run"]').click();
 await expect(page.locator('#run-controls')).toBeVisible();
 expect(attempts).toBe(2);
});

test('switching pose during a pending motion download does not unexpectedly start running', async ({ page }) => {
 let release;
 const waiting = new Promise(resolve => { release = resolve; });
 await page.route(motion, async route => {
  await waiting;
  await route.fulfill({ contentType: 'text/csv', body: csv });
 });
 await openRobot(page);
 await page.locator('[data-pose="run"]').click();
 await expect(page.locator('[data-pose="run"]')).toHaveText('Loading…');
 await page.locator('[data-pose="crouch"]').click();
 release();
 await expect(page.locator('[data-pose="run"]')).toBeEnabled();
 await expect(page.locator('[data-pose="crouch"]')).toHaveAttribute('aria-pressed', 'true');
 await expect(page.locator('#run-controls')).toBeHidden();
 await page.locator('[data-pose="run"]').click();
 await expect(page.locator('#run-controls')).toBeVisible();
});
