import { expect, type Page } from '@playwright/test';
import type { Direction } from 'tikitaki';

const fixturePath = './src/tests/widgets/weather-grid/fixtures/index.html';

/**
 * settleViewport
 * @param page The browser page containing the weather viewport.
 * @returns A promise that resolves when the current card is centered in its viewport.
 */
async function settleViewport(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
  await expect
    .poll(async () =>
      page.locator('.weather-viewport').evaluate((viewport) => {
        const current = viewport.querySelector('[data-tikitaki-role="current"]');
        if (!current) return false;
        const cellBox = current.getBoundingClientRect();
        const viewBox = viewport.getBoundingClientRect();
        return Math.abs(cellBox.x - viewBox.x) < 1 && Math.abs(cellBox.y - viewBox.y) < 1;
      }),
    )
    .toBe(true);
}

/**
 * swipe
 * @param page The browser page containing the weather viewport.
 * @param direction The requested physical swipe direction.
 * @param cancel Whether the touch gesture should be cancelled before release.
 * @returns A promise that resolves when the gesture has settled.
 */
export async function swipe(page: Page, direction: Direction, cancel = false): Promise<void> {
  const box = await page.locator('.weather-viewport').boundingBox();
  if (!box) throw new Error('The weather viewport must be visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.65;
  const dx = direction === 'left' ? -130 : direction === 'right' ? 130 : 0;
  const dy = direction === 'up' ? -130 : direction === 'down' ? 130 : 0;
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);

  if (touch) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let step = 1; step <= 5; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + (dx * step) / 5, y: y + (dy * step) / 5, id: 1 }],
        });
      }
      await session.send('Input.dispatchTouchEvent', {
        type: cancel ? 'touchCancel' : 'touchEnd',
        touchPoints: [],
      });
    } finally {
      await session.detach();
    }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 5 });
    await page.mouse.up();
  }
  await settleViewport(page);
}

/**
 * verifySwipeNavigation
 * @param page The isolated browser page using mouse or touch input.
 * @returns A promise that resolves after checking real gestures and grid boundaries.
 */
export async function verifySwipeNavigation(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(fixturePath);
  const viewport = page.getByRole('region', { name: 'Навигация по прогнозу' });
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-26/current');

  await swipe(page, 'left');
  await expect(viewport).toHaveAttribute('data-column', '1');
  await swipe(page, 'left');
  await expect(viewport).toHaveAttribute('data-column', '2');
  await swipe(page, 'down');
  await expect(viewport).toHaveAttribute('data-column', '2');
  await swipe(page, 'up');
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-27/daily');
  await expect(viewport).toHaveAttribute('data-column', '0');
  await swipe(page, 'left');
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-27/daily');
  await swipe(page, 'up');
  await swipe(page, 'left');
  await expect(viewport).toHaveAttribute('data-column', '1');
  await swipe(page, 'down');
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-27/daily');
  await swipe(page, 'down');
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-26/current');
  expect(await page.locator('[data-cell-id]').count()).toBeLessThanOrEqual(5);
  expect(errors).toEqual([]);
}

/**
 * verifyForecastUpdates
 * @param page The isolated browser page containing the forecast fixture.
 * @returns A promise that resolves after checking selection during data updates and remounting.
 */
export async function verifyForecastUpdates(page: Page): Promise<void> {
  await page.goto(fixturePath);
  const viewport = page.getByRole('region', { name: 'Навигация по прогнозу' });
  await viewport.focus();
  await page.keyboard.press('ArrowDown');
  await expect(viewport).toHaveAttribute('data-row', '1');
  await page.keyboard.press('ArrowDown');
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-28/daily');
  await page.getByRole('button', { name: 'Remove tomorrow', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-28/daily');
  await expect(viewport).toHaveAttribute('data-row', '1');
  await page.getByRole('button', { name: 'Restore forecast', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-28/daily');
  await expect(viewport).toHaveAttribute('data-row', '2');
  await page.getByRole('button', { name: 'Remove forecast', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-26/current');
  await page.getByRole('button', { name: 'Toggle viewport', exact: true }).click();
  await expect(viewport).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle viewport', exact: true }).click();
  await expect(viewport).toHaveAttribute('data-active-cell', '2026-10-26/current');
  await viewport.focus();
  await page.keyboard.press('ArrowRight');
  await expect(viewport).toHaveAttribute('data-column', '1');
  const size = page.viewportSize();
  if (!size) throw new Error('A fixed viewport is required');
  await page.setViewportSize({ width: size.width, height: size.height - 100 });
  await settleViewport(page);
  await expect(viewport).toHaveAttribute('data-column', '1');
}

/**
 * verifyCancelledTouch
 * @param page The isolated browser page with touch enabled.
 * @returns A promise that resolves after verifying that cancellation restores the current cell.
 */
export async function verifyCancelledTouch(page: Page): Promise<void> {
  await page.goto(fixturePath);
  await swipe(page, 'left', true);
  await expect(page.locator('.weather-viewport')).toHaveAttribute(
    'data-active-cell',
    '2026-10-26/current',
  );
}
