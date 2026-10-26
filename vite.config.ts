import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type ConfigEnv, type UserConfig } from 'vite';

/**
 * createViteConfig
 * @param environment The selected Vite build mode.
 * @returns The application configuration with isolated browser fixtures in test mode.
 */
function createViteConfig(environment: ConfigEnv): UserConfig {
  const input: Record<string, string> = {
    app: fileURLToPath(new URL('./index.html', import.meta.url)),
  };
  const isBrowserTest = environment.mode === 'e2e';
  if (isBrowserTest) {
    input['swipe-fixture'] = fileURLToPath(
      new URL('./src/tests/widgets/weather-grid/fixtures/index.html', import.meta.url),
    );
  }
  return {
    base: '/TikWeather/',
    plugins: [vue()],
    ...(isBrowserTest
      ? {
          define: {
            'import.meta.env.VITE_WEATHER_API_KEY': JSON.stringify('browser-test-only'),
            'import.meta.env.VITE_OPENWEATHERMAP_API_KEY': JSON.stringify('browser-test-only'),
          },
        }
      : {}),
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: { outDir: isBrowserTest ? 'dist-e2e' : 'dist', rolldownOptions: { input } },
  };
}

export default defineConfig(createViteConfig);
