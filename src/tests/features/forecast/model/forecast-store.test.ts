import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getForecast, useWeatherGridStore, type Forecast } from '@/entities/weather';
import { useForecastStore, type ForecastServices } from '@/features/forecast';
import { ApiError, type LocationQuery } from '@/shared/api';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

const location: LocationQuery = {
  source: 'device',
  latitude: 58,
  longitude: 56.25,
  countryCode: null,
};
const now = Date.UTC(2026, 9, 26, 5, 37);

beforeEach(() => setActivePinia(createPinia()));

/**
 * forecastFixture
 * @returns A normalized three day forecast for scheduler tests.
 */
async function forecastFixture(): Promise<Forecast> {
  return getForecast({
    apiKey: 'example-only',
    location,
    locale: 'ru',
    timeZone: 'Asia/Yekaterinburg',
    days: 3,
    fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(forecastResponse)),
  });
}

describe('forecast loading', () => {
  it('opens three loading days immediately and prioritizes the selected day', async () => {
    const forecast = await forecastFixture();
    const store = useForecastStore();
    let cancelledFirst = false;
    const request = vi.fn<ForecastServices['forecast']>(
      (_location, _locale, _timeZone, depth, signal) => {
        if (depth === 1)
          return new Promise<Forecast>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              cancelledFirst = true;
              reject(new ApiError('cancelled'));
            });
          });
        return Promise.resolve({ days: forecast.days.slice(0, depth) });
      },
    );
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );
    expect(useWeatherGridStore().grid).toHaveLength(3);
    expect(useWeatherGridStore().grid[0]?.[1]?.kind).toBe('hourly');
    expect(useWeatherGridStore().grid[1]?.[0]?.kind).toBe('daily');
    expect(store.days).toHaveLength(0);
    expect(request).toHaveBeenCalledWith(
      location,
      'ru',
      'Asia/Yekaterinburg',
      1,
      expect.any(AbortSignal),
    );

    store.focus(2);
    await vi.waitFor(() => {
      expect(store.days).toHaveLength(3);
    });
    expect(cancelledFirst).toBe(true);
    expect(request).toHaveBeenCalledWith(
      location,
      'ru',
      'Asia/Yekaterinburg',
      3,
      expect.any(AbortSignal),
    );
    expect(store.day('2026-10-28')?.maximum).toBe(8);
    expect(store.hour('2026-10-27', Date.UTC(2026, 9, 27, 7))?.temperature).toBe(9.5);
  });

  it('loads additional days in the background and allows retry after a forecast failure', async () => {
    const forecast = await forecastFixture();
    const store = useForecastStore();
    let attempts = 0;
    const request = vi.fn<ForecastServices['forecast']>((_location, _locale, _timeZone, depth) => {
      if (depth === 2 && attempts++ === 0) return Promise.reject(new ApiError('timeout'));
      return Promise.resolve({ days: forecast.days.slice(0, depth) });
    });
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );
    await vi.waitFor(() => {
      expect(store.failure).toBe('timeout');
    });
    expect(store.days).toHaveLength(1);
    expect(store.day('2026-10-26')).toBeDefined();
    store.focus(1);
    store.retry();
    await vi.waitFor(() => {
      expect(store.days).toHaveLength(3);
    });
    expect(store.failure).toBeNull();
    expect(request).toHaveBeenCalledWith(
      location,
      'ru',
      'Asia/Yekaterinburg',
      2,
      expect.any(AbortSignal),
    );
  });

  it('ignores a late response from an older location session', async () => {
    const forecast = await forecastFixture();
    const store = useForecastStore();
    let releaseOld: (() => void) | undefined;
    const oldRequest: ForecastServices['forecast'] = () =>
      new Promise<Forecast>((resolve) => {
        releaseOld = (): void => {
          resolve({ days: forecast.days.slice(0, 1) });
        };
      });
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: oldRequest },
    );
    const newRequest: ForecastServices['forecast'] = (_location, _locale, _timeZone, depth) =>
      Promise.resolve({ days: forecast.days.slice(0, depth) });
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: newRequest },
    );
    releaseOld?.();
    await vi.waitFor(() => {
      expect(store.days).toHaveLength(3);
    });
    expect(store.failure).toBeNull();
  });
});
