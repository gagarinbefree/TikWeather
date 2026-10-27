import { Geolocation } from '@capacitor/geolocation';
import AndroidApp from './platforms/android/AndroidApp.vue';
import { createAndroidGeolocation } from './platforms/android/geolocation';
import { mountWeatherApp } from './bootstrap';
import './styles/main.scss';

mountWeatherApp(AndroidApp, createAndroidGeolocation(Geolocation));
