import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { currentWeatherServicesKey, type CurrentWeatherServices } from '@/features/current-weather';
import { locate } from '@/entities/location';
import {
  getCurrentWeather,
  getForecast,
  getOpenMeteoCurrent,
  getOpenMeteoForecast,
  getOpenWeatherMapCurrent,
  getOpenWeatherMapForecast,
  withFallback,
  type Forecast,
} from '@/entities/weather';
import { forecastServicesKey, longestForecast, type ForecastServices } from '@/features/forecast';
import { openWeatherMapKey, weatherApiKey } from '@/shared/config';
import { ApiError } from '@/shared/api';
import App from './App.vue';
import './styles/main.scss';

const services: CurrentWeatherServices = {
  locate: (signal) => locate({ signal }),
  current: (location, locale, signal) =>
    withFallback(
      [
        (): ReturnType<CurrentWeatherServices['current']> =>
          getCurrentWeather({ location, locale, signal, apiKey: weatherApiKey() }),
        (): ReturnType<CurrentWeatherServices['current']> =>
          getOpenMeteoCurrent({ location, locale, signal }),
        (): ReturnType<CurrentWeatherServices['current']> =>
          getOpenWeatherMapCurrent({ location, locale, signal, apiKey: openWeatherMapKey() }),
      ],
      signal,
    ),
  now: Date.now,
};

/**
 * requireDays
 * @param request The forecast response from one provider.
 * @param minimum The requested minimum number of local days.
 * @returns A forecast with enough days to display.
 */
async function requireDays(request: Promise<Forecast>, minimum: number): Promise<Forecast> {
  const forecast = await request;
  if (forecast.days.length < minimum) throw new ApiError('invalidResponse');
  return forecast;
}

const forecastServices: ForecastServices = {
  forecast: (location, locale, timeZone, days, now, signal) =>
    days === 16
      ? longestForecast(
          [
            (): Promise<Forecast> =>
              requireDays(
                getOpenMeteoForecast({ location, locale, timeZone, days: 16, signal }),
                3,
              ),
            (): Promise<Forecast> =>
              requireDays(
                getForecast({
                  location,
                  locale,
                  timeZone,
                  days: 14,
                  signal,
                  apiKey: weatherApiKey(),
                }),
                3,
              ),
            (): Promise<Forecast> =>
              requireDays(
                getOpenWeatherMapForecast({
                  location,
                  locale,
                  timeZone,
                  days,
                  now,
                  signal,
                  apiKey: openWeatherMapKey(),
                }),
                3,
              ),
          ],
          signal,
          16,
        )
      : withFallback(
          [
            (): Promise<Forecast> =>
              requireDays(
                getForecast({ location, locale, timeZone, days, signal, apiKey: weatherApiKey() }),
                days,
              ),
            (): Promise<Forecast> =>
              requireDays(getOpenMeteoForecast({ location, locale, timeZone, days, signal }), days),
            (): Promise<Forecast> =>
              requireDays(
                getOpenWeatherMapForecast({
                  location,
                  locale,
                  timeZone,
                  days,
                  now,
                  signal,
                  apiKey: openWeatherMapKey(),
                }),
                days,
              ),
          ],
          signal,
        ),
};
createApp(App)
  .use(createPinia())
  .provide(currentWeatherServicesKey, services)
  .provide(forecastServicesKey, forecastServices)
  .mount('#app');
