import { expect, test } from '@playwright/test';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

test.use({ permissions: ['geolocation'], geolocation: { latitude: 58, longitude: 56.25 } });

test('shows A1 while forecast is pending and prioritizes the swiped day', async ({ page }) => {
  const requestedDays: number[] = [];
  let releaseTomorrow: (() => void) | undefined;
  await page.route('https://api.weatherapi.com/v1/current.json?**', async (route) => {
    await route.fulfill({ json: currentResponse });
  });
  await page.route('https://api.weatherapi.com/v1/forecast.json?**', async (route) => {
    const depth = Number(new URL(route.request().url()).searchParams.get('days'));
    requestedDays.push(depth);
    if (depth === 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (depth === 2) {
      await new Promise<void>((resolve) => {
        releaseTomorrow = resolve;
      });
    }
    try {
      await route.fulfill({
        json: { forecast: { forecastday: forecastResponse.forecast.forecastday.slice(0, depth) } },
      });
    } catch {
      // The request can be cancelled when the next day takes priority.
    }
  });

  await page.goto('./');
  await expect(page.getByRole('article', { name: 'Текущая погода' })).toBeVisible();
  await expect.poll(() => requestedDays).toContain(1);
  const viewport = page.getByRole('region', { name: 'Навигация по прогнозу' });
  await viewport.focus();
  await viewport.press('ArrowDown');
  await expect(viewport).toHaveAttribute('data-row', '1');
  await expect(viewport.locator('[data-cell-id="2026-10-27/daily"] .spinner-border')).toBeVisible();
  await expect.poll(() => requestedDays).toContain(2);
  releaseTomorrow?.();
  await expect(page.getByRole('article', { name: 'Прогноз на день' })).toContainText('Завтра');
  await expect(page.getByRole('article', { name: 'Прогноз на день' })).toContainText('10°C');
});
