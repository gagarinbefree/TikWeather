import { expect, test } from '@/tests/shared/lib/browser-test';
import { verifyApplicationShell, verifyPortraitViewport } from './weather-scenarios.ts';

test('opens the application shell at the GitHub Pages path', async ({ page }) => {
  await verifyApplicationShell(page);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /app-icon-192/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    /app-icon-180/,
  );
});

test('fits a portrait card into the viewport without horizontal overflow', async ({ page }) => {
  await verifyPortraitViewport(page);
});
