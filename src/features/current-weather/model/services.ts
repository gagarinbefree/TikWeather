import type { InjectionKey } from 'vue';
import type { CurrentWeather } from '@/entities/weather';
import type { LocationQuery } from '@/shared/api';

export interface CurrentWeatherServices {
  readonly locate: (signal: AbortSignal) => Promise<LocationQuery>;
  readonly current: (
    location: LocationQuery,
    locale: 'ru' | 'en',
    signal: AbortSignal,
  ) => Promise<CurrentWeather>;
  readonly now: () => number;
}

export const currentWeatherServicesKey: InjectionKey<CurrentWeatherServices> = Symbol(
  'current-weather-services',
);
