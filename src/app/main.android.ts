// Load Bootstrap layers before component styles to preserve the intended cascade.
import '@shared/styles/main.scss';
import { Geolocation } from '@capacitor/geolocation';
import AndroidApp from './platforms/android/AndroidApp.vue';
import { createAndroidGeolocation } from './platforms/android/geolocation';
import { mountWeatherApp } from './bootstrap';

mountWeatherApp(AndroidApp, createAndroidGeolocation(Geolocation));
