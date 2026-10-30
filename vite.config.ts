import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite';

/**
 * createViteConfig. Configure the web and Android builds
 *
 * @param environment The selected Vite build mode.
 * @returns The application configuration with isolated browser fixtures in test mode.
 */
function createViteConfig(environment: ConfigEnv): UserConfig {
  const input: Record<string, string> = {
    app: fileURLToPath(new URL('./index.html', import.meta.url)),
  };
  const isBrowserTest = environment.mode === 'e2e';
  const isAndroid = environment.mode === 'android';
  if (isBrowserTest) {
    input['diagnostics-fixture'] = fileURLToPath(
      new URL('./src/tests/shared/diagnostics/fixtures/index.html', import.meta.url),
    );
    input['update-fixture'] = fileURLToPath(
      new URL('./src/tests/app/ui/fixtures/index.html', import.meta.url),
    );
    input['swipe-fixture'] = fileURLToPath(
      new URL('./src/tests/widgets/weather-grid/fixtures/index.html', import.meta.url),
    );
  }
  return {
    base: isAndroid ? './' : '/ZoomWeather/',
    define: {
      'import.meta.env.VITE_HAWK_DSN': JSON.stringify(
        isBrowserTest
          ? ''
          : (process.env['HAWK_DSN'] ??
              loadEnv(environment.mode, process.cwd(), 'HAWK_')['HAWK_DSN'] ??
              ''),
      ),
    },
    envPrefix: ['VITE_WEATHER_SERVER_URL', 'VITE_APP_VERSION'],
    publicDir: fileURLToPath(new URL('./shared/assets/branding', import.meta.url)),
    plugins: [
      vue(),
      {
        name: 'android-entry',
        transformIndexHtml: {
          order: 'pre',
          handler(html): string {
            return isAndroid ? html.replace('/src/app/main.ts', '/src/app/main.android.ts') : html;
          },
        },
      },
      ...(!isAndroid
        ? [
            VitePWA({
              registerType: 'prompt',
              includeAssets: ['app-icon-180.png'],
              manifest: {
                name: 'ZoomWeather',
                short_name: 'ZoomWeather',
                description: 'Weather now and in the days ahead.',
                id: '/ZoomWeather/',
                start_url: '/ZoomWeather/',
                scope: '/ZoomWeather/',
                display: 'standalone',
                background_color: '#F5F7FA',
                theme_color: '#F5F7FA',
                icons: [
                  { src: 'app-icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'app-icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,png,webp,svg,ttf,webmanifest}'],
                navigateFallback: '/ZoomWeather/index.html',
                navigateFallbackAllowlist: [/^\/ZoomWeather\/?$/],
                cleanupOutdatedCaches: true,
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@assets': fileURLToPath(new URL('./shared/assets', import.meta.url)),
      },
    },
    build: {
      outDir: isAndroid ? 'dist-android' : isBrowserTest ? 'dist-e2e' : 'dist',
      rolldownOptions: { input },
    },
  };
}

export default defineConfig(createViteConfig);
