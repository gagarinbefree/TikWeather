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
} from '@/entities/weather';
import { forecastServicesKey, type ForecastServices } from '@/features/forecast';
import { openWeatherMapKey, weatherApiKey } from '@/shared/config';
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
const forecastServices: ForecastServices = {
  forecast: (location, locale, timeZone, days, now, signal) =>
    withFallback(
      [
        (): ReturnType<ForecastServices['forecast']> =>
          getForecast({ location, locale, timeZone, days, signal, apiKey: weatherApiKey() }),
        (): ReturnType<ForecastServices['forecast']> =>
          getOpenMeteoForecast({ location, locale, timeZone, days, signal }),
        (): ReturnType<ForecastServices['forecast']> =>
          getOpenWeatherMapForecast({
            location,
            locale,
            timeZone,
            days,
            now,
            signal,
            apiKey: openWeatherMapKey(),
          }),
      ],
      signal,
    ),
};
createApp(App)
  .use(createPinia())
  .provide(currentWeatherServicesKey, services)
  .provide(forecastServicesKey, forecastServices)
  .mount('#app');
