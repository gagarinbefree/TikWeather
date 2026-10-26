import { chromium, devices, type BrowserContextOptions } from '@playwright/test';
import {
  verifyApplicationShell,
  verifyPortraitViewport,
} from './pages/weather/weather-scenarios.ts';
import {
  verifyCancelledTouch,
  verifyForecastUpdates,
  verifySwipeNavigation,
} from './widgets/weather-grid/swipe-scenarios.ts';

/**
 * runConnectedChrome
 *
 * Run the shared browser scenarios through an existing Chrome debugging endpoint.
 * @returns A promise that resolves after all isolated browser checks pass.
 */
async function runConnectedChrome(): Promise<void> {
  const endpoint = process.env['PLAYWRIGHT_CDP_URL'];
  if (!endpoint) throw new Error('Set PLAYWRIGHT_CDP_URL to the Chrome debugging endpoint');
  const browser = await chromium.connectOverCDP(endpoint);
  const configurations: readonly {
    readonly name: string;
    readonly options: BrowserContextOptions;
  }[] = [
    { name: 'mobile Chrome', options: { ...devices['Pixel 7'] } },
    { name: 'desktop Chrome', options: { viewport: { width: 1440, height: 900 } } },
  ];

  try {
    for (const configuration of configurations) {
      const context = await browser.newContext({
        ...configuration.options,
        baseURL: 'http://127.0.0.1:4183/TikWeather/',
      });
      try {
        const page = await context.newPage();
        await verifyApplicationShell(page);
        console.log(`Passed application shell in ${configuration.name}`);
        await verifyPortraitViewport(page);
        console.log(`Passed viewport layout in ${configuration.name}`);
        await verifySwipeNavigation(page);
        console.log(`Passed swipe navigation in ${configuration.name}`);
        await verifyForecastUpdates(page);
        console.log(`Passed forecast updates in ${configuration.name}`);
        if (configuration.options.isMobile) {
          await verifyCancelledTouch(page);
          console.log(`Passed touch cancellation in ${configuration.name}`);
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

await runConnectedChrome();
