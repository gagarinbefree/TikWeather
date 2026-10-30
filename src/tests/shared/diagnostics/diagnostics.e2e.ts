import { expect, test } from '@/tests/shared/lib/browser-test';

interface DiagnosticEvent {
  readonly tags?: Readonly<Record<string, string>>;
  readonly extra?: { readonly recent_requests?: readonly string[] };
}

test('sends handled API failures and Vue exceptions through the real Hawk compatible SDK', async ({
  page,
}) => {
  const events: DiagnosticEvent[] = [];
  await page.route('https://hawk.example.test/**', async (route) => {
    const envelope = route.request().postData() ?? '';
    for (const line of envelope.split('\n')) {
      const item: unknown = JSON.parse(line);
      if (typeof item === 'object' && item !== null && 'event_id' in item && 'level' in item)
        events.push(item as DiagnosticEvent);
    }
    await route.fulfill({ status: 200, json: { id: 'accepted' } });
  });
  await page.route('https://weather.example.test/**', async (route) => {
    await route.fulfill({ status: 503, json: {} });
  });
  await page.goto('src/tests/shared/diagnostics/fixtures/index.html');
  await page.getByRole('button', { name: 'Fail request' }).click();
  await expect(page.getByRole('status')).toHaveText('Handled');
  await expect
    .poll(() => events.some((event) => event.tags?.['operation'] === 'current'))
    .toBe(true);
  const event = events.find((event) => event.tags?.['operation'] === 'current');
  expect(event?.extra?.recent_requests?.join('\n')).toContain('HTTP=503');
  await page.getByRole('button', { name: 'Fail component' }).click();
  await expect
    .poll(() => events.some((event) => event.tags?.['operation'] === 'unhandled'))
    .toBe(true);
  expect(JSON.stringify(events)).not.toMatch(
    /private-key|58\.0047|56\.2514|188\.16\.96\.136|weather\.example|example\.test\?token/,
  );
});

test('keeps the handled weather state usable when the collector is unavailable', async ({
  page,
}) => {
  await page.route('https://hawk.example.test/**', async (route) => {
    await route.abort();
  });
  await page.route('https://weather.example.test/**', async (route) => {
    await route.fulfill({ status: 503, json: {} });
  });
  await page.goto('src/tests/shared/diagnostics/fixtures/index.html');
  await page.getByRole('button', { name: 'Fail request' }).click();
  await expect(page.getByRole('status')).toHaveText('Handled');
  await expect(page.getByRole('button', { name: 'Fail request' })).toBeEnabled();
});
