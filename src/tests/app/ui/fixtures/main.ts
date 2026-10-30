import '@assets/styles/main.scss';
import { mountWeatherApp } from '@/app/bootstrap';
import AndroidApp from '@/app/platforms/android/AndroidApp.vue';

mountWeatherApp(AndroidApp);
