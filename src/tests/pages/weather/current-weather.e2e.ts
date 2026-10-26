import { expect, test } from '@playwright/test';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';

test.use({ permissions: ['geolocation'], geolocation: { latitude: 58.0047, longitude: 56.2514 } });

test('shows device weather directly with local icons and translated measurements', async ({
  page,
}) => {
  const apiCalls: string[] = [];
  let ipRequests = 0;
  await page.route('https://get.geojs.io/**', async (route) => {
    ipRequests++;
    await route.fulfill({ json: {} });
  });
  await page.route('https://api.weatherapi.com/v1/**', async (route) => {
    apiCalls.push(route.request().url());
    await route.fulfill({ json: currentResponse });
  });
  await page.goto('./');
  const card = page.getByRole('article', { name: 'Текущая погода' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('8,9°C');
  await expect(card).toContainText('Пасмурно');
  await expect(card).toContainText('Ощущается как');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(card.locator('[data-weather-icon]')).toHaveAttribute(
    'data-weather-icon',
    'WeatherCloudy',
  );
  await expect(card.locator('[data-weather-icon]')).not.toHaveCSS('mask-image', 'none');
  expect(ipRequests).toBe(0);
  expect(apiCalls).toHaveLength(1);
  expect(new URL(apiCalls[0] ?? '').pathname).toBe('/v1/current.json');
  expect(new URL(apiCalls[0] ?? '').searchParams.get('q')).toBe('58.0047,56.2514');
  const dimensions = await card.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    contentWidth: element.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width + 1);
  expect(await card.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    'rgb(223, 232, 239)',
  );
});

test('falls back to GeoJS after permission denial and retries below the error text', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'ru' });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback): void => {
          failure({ code: 1 } as GeolocationPositionError);
        },
      },
    });
  });
  await page.route('https://get.geojs.io/v1/ip/geo.json', async (route) => {
    await route.fulfill({
      json: { latitude: '58.0047', longitude: '56.2514', country_code: 'RU' },
    });
  });
  let attempts = 0;
  await page.route('https://api.weatherapi.com/v1/current.json?**', async (route) => {
    attempts++;
    if (attempts === 1) await route.abort('failed');
    else await route.fulfill({ json: currentResponse });
  });
  await page.goto('./');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Не удалось подключиться');
  const retry = page.getByRole('button', { name: 'Повторить', exact: true });
  const messageBox = await alert.boundingBox();
  const buttonBox = await retry.boundingBox();
  expect(messageBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  if (!messageBox || !buttonBox) throw new Error('Expected visible error controls');
  expect(buttonBox.y).toBeGreaterThanOrEqual(messageBox.y + messageBox.height);
  expect(Math.abs(buttonBox.x - messageBox.x)).toBeLessThanOrEqual(1);
  await retry.click();
  await expect(page.getByRole('article', { name: 'Текущая погода' })).toBeVisible();
  await expect(alert).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('keeps a short portrait screen readable with long place names', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route('https://api.weatherapi.com/v1/current.json?**', async (route) => {
    await route.fulfill({
      json: {
        ...currentResponse,
        location: {
          ...currentResponse.location,
          name: 'Petropavlovsk-Kamchatsky',
          country: 'United States of America',
          tz_id: 'America/New_York',
        },
      },
    });
  });
  await page.goto('./');
  const card = page.getByRole('article', { name: 'Current weather' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Feels like');
  const visibility = card.getByText('Visibility', { exact: true });
  await visibility.scrollIntoViewIfNeeded();
  await expect(visibility).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
