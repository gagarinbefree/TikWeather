import { test } from '@/tests/shared/lib/browser-test';
import {
  verifyCancelledTouch,
  verifyForecastUpdates,
  verifySwipeNavigation,
} from './swipe-scenarios.ts';

test('navigates hours and days with real mouse or touch gestures', async ({ page }) => {
  await verifySwipeNavigation(page);
});

test('preserves the selected forecast during updates and resize and supports remounting', async ({
  page,
}) => {
  await verifyForecastUpdates(page);
});

test('restores the current cell when a touch gesture is cancelled', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This scenario requires touch input');
  await verifyCancelledTouch(page);
});
