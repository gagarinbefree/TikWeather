import { expect, test, type Locator } from '@playwright/test';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

test.use({
  permissions: ['geolocation'],
  geolocation: { latitude: 58, longitude: 56.25 },
  viewport: { width: 320, height: 662 },
});

/**
 * expectCardInsideCell. Check that a loaded card fits within its padded swipe cell
 *
 * @param card The visible weather card.
 * @returns A promise that resolves after checking both ends of the card.
 */
async function expectCardInsideCell(card: Locator): Promise<void> {
  await expect(card).toBeVisible();
  const bounds = await card.evaluate((article) => {
    const cell = article.closest('.weather-cell');
    if (!cell) throw new Error('Missing weather cell');
    const cardBox = article.getBoundingClientRect();
    const cellBox = cell.getBoundingClientRect();
    const style = getComputedStyle(cell);
    return {
      top: cardBox.top - cellBox.top,
      bottom: cellBox.bottom - cardBox.bottom,
      paddingTop: Number.parseFloat(style.paddingTop),
      paddingBottom: Number.parseFloat(style.paddingBottom),
      scrollHeight: cell.scrollHeight,
      height: cell.clientHeight,
    };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.paddingTop - 1);
  expect(bounds.bottom).toBeGreaterThanOrEqual(bounds.paddingBottom - 1);
  expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height + 1);
  await expect(card.locator('h2')).toBeInViewport({ ratio: 1 });
  await expect(card.locator('dd').last()).toBeInViewport({ ratio: 1 });
}

test('keeps current daily and hourly cards fully visible at the Android viewport size', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-26T05:37:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://api.bigdatacloud.net/**', async (route) => {
    await route.fulfill({
      json: {
        lookupSource: 'coordinates',
        latitude: 58,
        longitude: 56.25,
        countryCode: 'RU',
        city: 'Пермь',
      },
    });
  });
  await page.route('https://api.weatherapi.com/v1/current.json?**', async (route) => {
    await route.fulfill({ json: currentResponse });
  });
  await page.route('https://api.weatherapi.com/v1/forecast.json?**', async (route) => {
    await route.fulfill({ json: forecastResponse });
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    await route.fulfill({ status: 503, json: {} });
  });
  await page.route('https://api.openweathermap.org/**', async (route) => {
    await route.fulfill({ status: 503, json: {} });
  });
  await page.goto('./');
  await page.evaluate(async () => document.fonts.ready);
  const current = page.getByRole('article', { name: 'Текущая погода' });
  await expect(current).toContainText('07:45');
  await expectCardInsideCell(current);
  await expect(current.locator('h2')).toHaveCSS('font-weight', '600');
  await expect(current.locator('header > p').first()).toHaveCSS('margin-bottom', '0px');
  await page.screenshot({ path: test.info().outputPath('current-card.png') });

  const viewport = page.getByRole('region', { name: 'Навигация по прогнозу' });
  await viewport.focus();
  await viewport.press('ArrowDown');
  await expect(viewport).toHaveAttribute('data-row', '1');
  const daily = page.getByRole('article', { name: 'Прогноз на день' });
  await expect(daily).toContainText('07:47');
  await expectCardInsideCell(daily);
  await viewport.press('ArrowRight');
  await expect(viewport).toHaveAttribute('data-column', '1');
  await expectCardInsideCell(page.getByRole('article', { name: 'Почасовой прогноз' }));
});
