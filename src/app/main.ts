import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { currentWeatherServicesKey, type CurrentWeatherServices } from '@/features/current-weather';
import { locate } from '@/entities/location';
import { getCurrentWeather, getForecast } from '@/entities/weather';
import { forecastServicesKey, type ForecastServices } from '@/features/forecast';
import { weatherApiKey } from '@/shared/config';
import App from './App.vue';
import './styles/main.scss';

const services: CurrentWeatherServices = {
  locate: (signal) => locate({ signal }),
  current: (location, locale, signal) =>
    getCurrentWeather({ location, locale, signal, apiKey: weatherApiKey() }),
  now: Date.now,
};
const forecastServices: ForecastServices = {
  forecast: (location, locale, timeZone, days, signal) =>
    getForecast({ location, locale, timeZone, days, signal, apiKey: weatherApiKey() }),
};
createApp(App)
  .use(createPinia())
  .provide(currentWeatherServicesKey, services)
  .provide(forecastServicesKey, forecastServices)
  .mount('#app');
