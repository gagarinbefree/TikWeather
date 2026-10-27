import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { useWeatherGridStore, type CurrentWeather, type WeatherSnapshot } from '@/entities/weather';
import { ApiError, type FailureKind, type LocationQuery } from '@/shared/api';
import { localeForCountry, browserLocale } from '@/shared/locales';
import type { CurrentWeatherServices } from './services';

type CurrentWeatherState =
  | { readonly status: 'loading'; readonly phase: 'location' | 'weather' }
  | {
      readonly status: 'ready';
      readonly weather: CurrentWeather;
      readonly location: LocationQuery;
      readonly now: number;
      readonly cachedAt: number | null;
    }
  | { readonly status: 'error'; readonly failure: FailureKind };

/**
 * useCurrentWeatherStore(). Manage location detection and current weather loading
 *
 * @returns The cancellable device location and current observation flow.
 */
export const useCurrentWeatherStore = defineStore('current-weather', () => {
  const grid = useWeatherGridStore();
  const locale = shallowRef(browserLocale());
  const state = shallowRef<CurrentWeatherState>({ status: 'loading', phase: 'location' });
  let controller: AbortController | null = null;
  let revision = 0;

  /**
   * cancel(). Cancel the current weather request and discard pending results
   */
  function cancel(): void {
    revision++;
    controller?.abort();
    controller = null;
  }

  /**
   * restore(). Restore saved current weather and rebuild its grid
   *
   * @param snapshot The last normalized weather saved in this browser.
   * @param now The current instant used for the restored grid.
   */
  function restore(snapshot: WeatherSnapshot, now = Date.now()): void {
    cancel();
    locale.value = snapshot.locale;
    grid.update({ now, timeZone: snapshot.weather.timeZone, days: [] });
    state.value = {
      status: 'ready',
      weather: snapshot.weather,
      location: { source: 'automatic' },
      now,
      cachedAt: snapshot.savedAt,
    };
  }

  /**
   * offline(). Show a connection error when no saved weather is available
   */
  function offline(): void {
    if (state.value.status !== 'ready') state.value = { status: 'error', failure: 'connection' };
  }

  /**
   * load(). Find the location and load its current weather
   *
   * @param services The location and current weather dependencies for this session.
   * @returns A promise that settles after publishing the latest request outcome.
   */
  async function load(services: CurrentWeatherServices): Promise<void> {
    cancel();
    const token = revision;
    const active = new AbortController();
    controller = active;
    const cached = state.value.status === 'ready' && state.value.cachedAt !== null;
    if (!cached) state.value = { status: 'loading', phase: 'location' };
    try {
      const location = await services.locate(active.signal);
      if (token !== revision) return;
      if (location.source !== 'automatic' && location.countryCode)
        locale.value = localeForCountry(location.countryCode);
      if (!cached) state.value = { status: 'loading', phase: 'weather' };
      const weather = await services.current(location, locale.value, active.signal);
      if (token !== revision) return;
      if (weather.country.trim()) locale.value = localeForCountry(weather.country);
      const now = services.now();
      grid.update({ now, timeZone: weather.timeZone, days: [] });
      state.value = { status: 'ready', weather, location, now, cachedAt: null };
    } catch (error) {
      if (token !== revision) return;
      if (!cached)
        state.value = {
          status: 'error',
          failure: error instanceof ApiError ? error.kind : 'connection',
        };
    } finally {
      if (token === revision) controller = null;
    }
  }

  return { state, locale, load, restore, offline, cancel };
});
