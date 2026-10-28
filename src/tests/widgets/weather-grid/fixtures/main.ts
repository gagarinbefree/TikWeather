import '@shared/styles/main.scss';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import FixtureApp from './FixtureApp.vue';

createApp(FixtureApp).use(createPinia()).mount('#app');
