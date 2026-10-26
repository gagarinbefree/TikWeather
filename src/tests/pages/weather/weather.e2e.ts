import { test } from '@playwright/test';
import { verifyApplicationShell, verifyPortraitViewport } from './weather-scenarios.ts';

test('opens the application shell at the GitHub Pages path', async ({ page }) => {
  await verifyApplicationShell(page);
});

test('fits a portrait card into the viewport without horizontal overflow', async ({ page }) => {
  await verifyPortraitViewport(page);
});
