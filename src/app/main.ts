// Load Bootstrap layers before component styles to preserve the intended cascade.
import '@shared/styles/main.scss';
import App from './App.vue';
import { mountWeatherApp } from './bootstrap';

mountWeatherApp(App);
