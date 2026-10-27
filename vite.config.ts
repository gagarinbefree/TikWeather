import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
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
    plugins: [
      vue(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['app-icon-180.png'],
        manifest: {
          name: 'TikWeather',
          short_name: 'TikWeather',
          description: 'Weather now and in the days ahead.',
          id: '/TikWeather/',
          start_url: '/TikWeather/',
          scope: '/TikWeather/',
          display: 'standalone',
          background_color: '#F5F7FA',
          theme_color: '#F5F7FA',
          icons: [
            { src: 'app-icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'app-icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ttf,webmanifest}'],
          navigateFallback: '/TikWeather/index.html',
          navigateFallbackAllowlist: [/^\/TikWeather\/?$/],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
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
