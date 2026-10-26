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
  it('expands through the available sixteen days and keeps their real hours', async () => {
    const fixture = await forecastFixture();
    const first = fixture.days[0];
    const firstHour = first?.hours[0];
    if (!first || !firstHour) throw new Error('Missing forecast fixture');
    const longForecast = Array.from({ length: 16 }, (_, index) => ({
      ...first,
      date: new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10),
      hours: [{ ...firstHour, timestamp: firstHour.timestamp + index * 86_400_000 }],
    }));
    const request = vi.fn<ForecastServices['forecast']>((_location, _locale, _timeZone, depth) =>
      Promise.resolve({ days: longForecast.slice(0, depth) }),
    );
    const store = useForecastStore();
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );

    await vi.waitFor(() => {
      expect(store.days).toHaveLength(16);
    });
    expect(request.mock.calls.map((call) => call[3])).toEqual([1, 3, 16]);
    expect(useWeatherGridStore().grid).toHaveLength(16);
    expect(store.hour('2026-11-10', firstHour.timestamp + 15 * 86_400_000)).toBeDefined();
  });

  it('removes loading rows beyond the shorter provider response', async () => {
    const fixture = await forecastFixture();
    const first = fixture.days[0];
    if (!first) throw new Error('Missing forecast fixture');
    const available = Array.from({ length: 6 }, (_, index) => ({
      ...first,
      date: new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10),
      hours: first.hours.map((hour) => ({
        ...hour,
        timestamp: hour.timestamp + index * 86_400_000,
      })),
    }));
    const request = vi.fn<ForecastServices['forecast']>((_location, _locale, _timeZone, depth) =>
      Promise.resolve({ days: available.slice(0, depth) }),
    );
    const store = useForecastStore();
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(3);
      expect(store.days).toHaveLength(6);
    });
    expect(useWeatherGridStore().grid).toHaveLength(6);
    expect(useWeatherGridStore().grid.at(-1)?.[0]?.date).toBe('2026-10-31');
    store.focus(4);
    store.focus(5);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('retains detailed loaded hours when a longer later response is sparse', async () => {
    const fixture = await forecastFixture();
    const first = fixture.days[0];
    const firstHour = first?.hours[0];
    if (!first || !firstHour) throw new Error('Missing forecast fixture');
    const detailed = fixture.days.map((day) => ({
      ...day,
      hours: [
        ...day.hours,
        { ...firstHour, timestamp: (day.hours[0]?.timestamp ?? firstHour.timestamp) + 7_200_000 },
      ],
    }));
    const sparse = Array.from({ length: 6 }, (_, index) => ({
      ...first,
      date: new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10),
      hours: [{ ...firstHour, timestamp: firstHour.timestamp + index * 86_400_000 }],
    }));
    const request = vi.fn<ForecastServices['forecast']>((_location, _locale, _timeZone, depth) =>
      Promise.resolve(
        depth === 16
          ? { days: sparse, intervalHours: 3 }
          : { days: detailed.slice(0, depth), intervalHours: 2 },
      ),
    );
    const store = useForecastStore();
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );

    await vi.waitFor(() => {
      expect(store.days).toHaveLength(6);
    });
    expect(store.day('2026-10-26')?.hours).toHaveLength(2);
    expect(
      useWeatherGridStore()
        .grid[0]?.slice(1)
        .map((cell) => cell.timestamp),
    ).toContain(firstHour.timestamp + 7_200_000);
  });

  it('opens the maximum loading horizon and prioritizes the selected day', async () => {
    const forecast = await forecastFixture();
    const store = useForecastStore();
    let cancelledFirst = false;
    const request = vi.fn<ForecastServices['forecast']>(
      (_location, _locale, _timeZone, depth, _now, signal) => {
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
    expect(useWeatherGridStore().grid).toHaveLength(16);
    expect(useWeatherGridStore().grid[0]?.[1]?.kind).toBe('hourly');
    expect(useWeatherGridStore().grid[1]?.[0]?.kind).toBe('daily');
    expect(store.days).toHaveLength(0);
    expect(request).toHaveBeenCalledWith(
      location,
      'ru',
      'Asia/Yekaterinburg',
      1,
      now,
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
      now,
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
      if (depth === 3 && attempts++ === 0) return Promise.reject(new ApiError('timeout'));
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
    expect(request.mock.calls.filter((call) => call[3] === 3)).toHaveLength(1);
    store.retry();
    await vi.waitFor(() => {
      expect(store.days).toHaveLength(3);
    });
    expect(store.failure).toBeNull();
    expect(request).toHaveBeenCalledWith(
      location,
      'ru',
      'Asia/Yekaterinburg',
      3,
      now,
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

  it('uses actual three hour provider timestamps after the horizon probe', async () => {
    const forecast = await forecastFixture();
    const store = useForecastStore();
    const request = vi.fn<ForecastServices['forecast']>().mockResolvedValue({
      days: forecast.days,
      intervalHours: 3,
    });
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );
    await vi.waitFor(() => {
      expect(store.days).toHaveLength(3);
    });
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
    });
    expect(
      useWeatherGridStore()
        .grid[1]?.slice(1)
        .map((cell) => cell.timestamp),
    ).toEqual([Date.UTC(2026, 9, 27, 7)]);
  });

  it('replaces three hour cells when a later request succeeds through an hourly provider', async () => {
    const forecast = await forecastFixture();
    const firstDay = forecast.days[0];
    const firstHour = firstDay?.hours[0];
    if (!firstDay || !firstHour) throw new Error('Missing forecast fixture');
    const mapHour = {
      ...firstHour,
      timestamp: Date.UTC(2026, 9, 26, 8),
    };
    const request = vi.fn<ForecastServices['forecast']>((_location, _locale, _timeZone, depth) =>
      Promise.resolve(
        depth === 1
          ? {
              days: [{ ...firstDay, hours: [mapHour] }],
              intervalHours: 3,
            }
          : { days: forecast.days.slice(0, depth), intervalHours: 2 },
      ),
    );
    const store = useForecastStore();
    store.start(
      { location, locale: 'ru', timeZone: 'Asia/Yekaterinburg', now },
      { forecast: request },
    );

    await vi.waitFor(() => {
      expect(store.days).toHaveLength(3);
    });
    const grid = useWeatherGridStore().grid;
    const currentHour = grid[0]?.[1]?.timestamp;
    expect(currentHour).toBe(Date.UTC(2026, 9, 26, 7));
    expect(store.hour('2026-10-26', currentHour ?? NaN)).toBeDefined();
  });
});
