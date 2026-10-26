import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type LocationQuery } from '@/shared/api';
import { useCurrentWeatherStore, type CurrentWeatherServices } from '@/features/current-weather';
import { getCurrentWeather, useWeatherGridStore, type CurrentWeather } from '@/entities/weather';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';

beforeEach(() => setActivePinia(createPinia()));

/**
 * services
 * @returns Deterministic services for the current weather flow.
 */
function services(): CurrentWeatherServices {
  return {
    locate: vi.fn().mockResolvedValue({ source: 'automatic' }),
    current: (location, locale, signal) =>
      getCurrentWeather({
        location,
        locale,
        signal,
        apiKey: 'example-only',
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
      }),
    now: () => currentResponse.location.localtime_epoch * 1000,
  };
}

describe('current weather flow', () => {
  it('locates first and shows A1 immediately without requesting the forecast', async () => {
    const store = useCurrentWeatherStore();
    const dependencies = services();
    await store.load(dependencies);
    expect(dependencies.locate).toHaveBeenCalledTimes(1);
    expect(store.state).toMatchObject({ status: 'ready', weather: { temperature: 8.9 } });
    expect(store.state).toMatchObject({ location: { source: 'automatic' } });
    expect(store.locale).toBe('ru');
    expect(useWeatherGridStore().grid).toHaveLength(1);
    expect(useWeatherGridStore().grid[0]).toHaveLength(1);
  });

  it('exposes a recoverable failure and supports retry', async () => {
    const store = useCurrentWeatherStore();
    await store.load({
      ...services(),
      current: (): Promise<CurrentWeather> => Promise.reject(new ApiError('timeout')),
    });
    expect(store.state).toEqual({ status: 'error', failure: 'timeout' });
    await store.load(services());
    expect(store.state.status).toBe('ready');
  });

  it('ignores an old response after retry and cancellation', async () => {
    const store = useCurrentWeatherStore();
    const dependencies = services();
    let release: (() => void) | undefined;
    const first = store.load({
      ...dependencies,
      locate: (): Promise<LocationQuery> =>
        new Promise((resolve) => {
          release = (): void => {
            resolve({ source: 'automatic' });
          };
        }),
    });
    await store.load(dependencies);
    release?.();
    await first;
    expect(store.state.status).toBe('ready');
    const current = vi.fn(dependencies.current);
    const pending = store.load({ ...dependencies, current });
    store.cancel();
    await pending;
    expect(current).not.toHaveBeenCalled();
  });
});
