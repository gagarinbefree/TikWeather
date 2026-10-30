import { createApp } from 'vue';
import FixtureApp from './FixtureApp.vue';
import { initializeDiagnostics } from '@/shared/diagnostics';

const app = createApp(FixtureApp);
initializeDiagnostics(app, 'Browser', 'https://public@hawk.example.test/0');
app.mount('#app');
