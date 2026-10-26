import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { currentWeatherServicesKey, type CurrentWeatherServices } from '@/features/current-weather';
import { locate } from '@/entities/location';
import { getCurrentWeather } from '@/entities/weather';
import { weatherApiKey } from '@/shared/config';
import App from './App.vue';
import './styles/main.scss';

const services: CurrentWeatherServices = {
  locate: (signal) => locate({ signal }),
  current: (location, locale, signal) =>
    getCurrentWeather({ location, locale, signal, apiKey: weatherApiKey() }),
  now: Date.now,
};
createApp(App).use(createPinia()).provide(currentWeatherServicesKey, services).mount('#app');
