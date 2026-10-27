import { expect, test } from '@playwright/test';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

test.use({ permissions: ['geolocation'], geolocation: { latitude: 58, longitude: 56.25 } });

test('shows the last forecast immediately after an offline restart', async ({ page, context }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T05:37:00Z'));
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
    .poll(async () => {
      const raw: unknown = await page.evaluate(() => localStorage.getItem('tikweather.weather.v1'));
      return typeof raw === 'string' ? [...raw.matchAll(/"date"/g)].length : 0;
    })
    .toBeGreaterThanOrEqual(3);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  const current = page.getByRole('article', { name: 'Текущая погода' });
  await expect(current).toContainText('8,9°C');
  await expect(current).toContainText('Сохранённый прогноз от');
  await expect(current.getByRole('button', { name: 'Повторить' })).toBeVisible();
  const viewport = page.getByRole('region', { name: 'Навигация по прогнозу' });
  await viewport.focus();
  await viewport.press('ArrowDown');
  await expect(page.getByRole('article', { name: 'Прогноз на день' })).toContainText('Завтра');
  await expect(page.getByRole('article', { name: 'Прогноз на день' })).toContainText(
    'Сохранённый прогноз от',
  );
});
