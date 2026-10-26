import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { useWeatherGridStore, type CurrentWeather } from '@/entities/weather';
import { ApiError, type FailureKind } from '@/shared/api';
import { localeForCountry, browserLocale } from '@/shared/locales';
import type { CurrentWeatherServices } from './services';

type CurrentWeatherState =
  | { readonly status: 'loading'; readonly phase: 'location' | 'weather' }
  | { readonly status: 'ready'; readonly weather: CurrentWeather }
  | { readonly status: 'error'; readonly failure: FailureKind };

/**
 * useCurrentWeatherStore
 * @returns The cancellable device location and current observation flow.
 */
export const useCurrentWeatherStore = defineStore('current-weather', () => {
  const grid = useWeatherGridStore();
  const locale = shallowRef(browserLocale());
  const state = shallowRef<CurrentWeatherState>({ status: 'loading', phase: 'location' });
  let controller: AbortController | null = null;
  let revision = 0;

  /**
   * cancel
   */
  function cancel(): void {
    revision++;
    controller?.abort();
    controller = null;
  }

  /**
   * load
   * @param services The location and current weather dependencies for this session.
   * @returns A promise that settles after publishing the latest request outcome.
   */
  async function load(services: CurrentWeatherServices): Promise<void> {
    cancel();
    const token = revision;
    const active = new AbortController();
    controller = active;
    state.value = { status: 'loading', phase: 'location' };
    try {
      const location = await services.locate(active.signal);
      if (token !== revision) return;
      if (location.source !== 'automatic' && location.countryCode)
        locale.value = localeForCountry(location.countryCode);
      state.value = { status: 'loading', phase: 'weather' };
      const weather = await services.current(location, locale.value, active.signal);
      if (token !== revision) return;
      locale.value = localeForCountry(weather.country);
      grid.update({ now: services.now(), timeZone: weather.timeZone, days: [] });
      state.value = { status: 'ready', weather };
    } catch (error) {
      if (token !== revision) return;
      state.value = {
        status: 'error',
        failure: error instanceof ApiError ? error.kind : 'connection',
      };
    } finally {
      if (token === revision) controller = null;
    }
  }

  return { state, locale, load, cancel };
});
