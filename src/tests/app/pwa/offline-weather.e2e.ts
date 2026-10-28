import { expect, test, type Locator } from '@playwright/test';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

test.use({ permissions: ['geolocation'], geolocation: { latitude: 58, longitude: 56.25 } });

interface CardBlockAppearance {
  readonly selector: string;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly color: string;
  readonly background: string;
}

/**
 * cardAppearance. Read the layout and styles of the main weather blocks
 *
 * @param card The visible weather card.
 * @returns The position size and appearance of its main blocks.
 */
async function cardAppearance(card: Locator): Promise<readonly CardBlockAppearance[]> {
  return card.evaluate((article) => {
    const origin = article.getBoundingClientRect();
    return [
      'header',
      '[data-weather-icon]',
      '[class$="__temperature"]',
      '[class$="__condition"]',
      'dl',
    ].map((selector) => {
      const block = article.querySelector(selector);
      if (!(block instanceof HTMLElement)) throw new Error(`Missing card block ${selector}`);
      const bounds = block.getBoundingClientRect();
      const style = getComputedStyle(block);
      return {
        selector,
        top: Math.round((bounds.top - origin.top) * 100) / 100,
        left: Math.round((bounds.left - origin.left) * 100) / 100,
        width: bounds.width,
        height: bounds.height,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        background: style.background,
      };
    });
  });
}

test('shows the last forecast immediately after an offline restart', async ({ page, context }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T05:37:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://api.weatherapi.com/v1/current.json?**', async (route) => {
    await route.fulfill({ json: currentResponse });
  });
  await page.route('https://api.weatherapi.com/v1/forecast.json?**', async (route) => {
    const depth = Number(new URL(route.request().url()).searchParams.get('days'));
    await route.fulfill({
      json: { forecast: { forecastday: forecastResponse.forecast.forecastday.slice(0, depth) } },
    });
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    await route.fulfill({ status: 503, json: {} });
  });
  await page.route('https://api.openweathermap.org/**', async (route) => {
    await route.fulfill({ status: 503, json: {} });
  });

  await page.goto('./');
  await expect
    .poll(
      async () => {
        const raw: unknown = await page.evaluate(() =>
          localStorage.getItem('tikweather.weather.v1'),
        );
        return typeof raw === 'string' ? [...raw.matchAll(/"date"/g)].length : 0;
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(3);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  const current = page.getByRole('article', { name: 'Текущая погода' });
  const daily = page.getByRole('article', { name: 'Прогноз на день' });
  const hourly = page.getByRole('article', { name: 'Почасовой прогноз' });
  const viewport = page.getByRole('region', { name: 'Навигация по прогнозу' });
  await expect(current.locator('details')).toHaveCount(0);
  await expect(current).toContainText('07:45');
  await page.evaluate(async () => document.fonts.ready);
  const liveCurrent = await cardAppearance(current);
  await expect(viewport).toHaveAttribute('data-grid-rows', '3');
  await viewport.focus();
  await viewport.press('ArrowDown');
  await expect(viewport).toHaveAttribute('data-row', '1');
  await expect(daily).toContainText('07:47');
  const liveDaily = await cardAppearance(daily);
  await viewport.press('ArrowRight');
  await expect(viewport).toHaveAttribute(
    'data-active-cell',
    `2026-10-27/hour/${String(Date.UTC(2026, 9, 27, 7))}`,
  );
  await expect(hourly).toContainText('9,5°C');
  const liveHourly = await cardAppearance(hourly);

  await context.setOffline(true);
  await page.reload();
  await expect(current).toContainText('8,9°C');
  await page.evaluate(async () => document.fonts.ready);
  expect(await cardAppearance(current)).toEqual(liveCurrent);
  await expect(current.locator('.weather-cache-status__icon')).toBeVisible();
  const toggleBounds = await current.locator('summary').boundingBox();
  const iconBounds = await current.locator('.weather-cache-status__icon').boundingBox();
  if (!toggleBounds || !iconBounds) throw new Error('Missing cache toggle bounds');
  expect(iconBounds.x - toggleBounds.x).toBeCloseTo((toggleBounds.width - iconBounds.width) / 2, 1);
  expect(iconBounds.y - toggleBounds.y).toBeCloseTo(
    (toggleBounds.height - iconBounds.height) / 2,
    1,
  );
  await current.locator('summary').click();
  await expect(current.getByRole('status')).toContainText('Сохранённый прогноз от');
  await expect(current.getByRole('button', { name: 'Повторить' })).toBeVisible();
  expect(await cardAppearance(current)).toEqual(liveCurrent);
  await page.screenshot({ path: test.info().outputPath('cached-current-details.png') });
  await current.locator('summary').press('Escape');
  await expect(current.getByRole('status')).toBeHidden();
  await viewport.focus();
  await page.screenshot({ path: test.info().outputPath('cached-current.png') });
  await expect(viewport).toHaveAttribute('data-grid-rows', '3');
  await expect(viewport.locator('[data-cell-id="2026-10-27/daily"]')).toHaveCount(1);
  await viewport.focus();
  await viewport.press('ArrowDown');
  await expect(viewport).toHaveAttribute('data-row', '1');
  await expect(daily).toContainText('Завтра');
  expect(await cardAppearance(daily)).toEqual(liveDaily);
  await daily.locator('summary').focus();
  await daily.locator('summary').press('Enter');
  await expect(daily.getByRole('status')).toContainText('Сохранённый прогноз от');
  expect(await cardAppearance(daily)).toEqual(liveDaily);
  await daily.locator('summary').press('Escape');
  await viewport.focus();
  await viewport.press('ArrowRight');
  await expect(viewport).toHaveAttribute(
    'data-active-cell',
    `2026-10-27/hour/${String(Date.UTC(2026, 9, 27, 7))}`,
  );
  await expect(hourly).toContainText('9,5°C');
  expect(await cardAppearance(hourly)).toEqual(liveHourly);
  await hourly.locator('summary').click();
  await expect(hourly.getByRole('status')).toContainText('Сохранённый прогноз от');
  expect(await cardAppearance(hourly)).toEqual(liveHourly);
});
