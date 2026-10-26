import { createApp } from 'vue';
import { createPinia } from 'pinia';
import FixtureApp from './FixtureApp.vue';
import '@/app/styles/main.scss';

createApp(FixtureApp).use(createPinia()).mount('#app');
