import type { InjectionKey } from 'vue';
import type { Forecast } from '@/entities/weather';
import type { LocationQuery } from '@/shared/api';

export interface ForecastServices {
  readonly forecast: (
    location: LocationQuery,
    locale: 'ru' | 'en',
    timeZone: string,
    days: 1 | 3 | 16,
    now: number,
    signal: AbortSignal,
  ) => Promise<Forecast>;
}

export const forecastServicesKey: InjectionKey<ForecastServices> = Symbol('forecast-services');
