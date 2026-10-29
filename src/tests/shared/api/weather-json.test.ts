import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestWeatherJson, weatherEndpoint } from '@/shared/api';

afterEach(() => vi.unstubAllEnvs());

describe('backend weather transport', () => {
  it('keeps provider bytes and the original retained timestamp separate', async () => {
    const fetchedAt = '2026-10-29T06:00:00Z';
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        { current: { temp_c: 8.9 } },
        {
          headers: { 'X-Weather-Cache': 'stale', 'X-Weather-Fetched-At': fetchedAt },
        },
      ),
    );
    await expect(
      requestWeatherJson('https://backend.example/api/weather', { fetcher }),
    ).resolves.toEqual({
      payload: { current: { temp_c: 8.9 } },
      serverCachedAt: Date.parse(fetchedAt),
    });
  });

  it('never presents a retained response with an unreadable timestamp as live weather', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({}, { headers: { 'X-Weather-Cache': 'stale' } }));
    await expect(
      requestWeatherJson('https://backend.example/api/weather', { fetcher }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });

  it('does not mark fresh server responses as saved weather', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {},
        {
          headers: { 'X-Weather-Cache': 'fresh', 'X-Weather-Fetched-At': '2026-10-29T06:00:00Z' },
        },
      ),
    );
    await expect(
      requestWeatherJson('https://backend.example/api/weather', { fetcher }),
    ).resolves.toEqual({ payload: {} });
  });

  it('allows a public backend override without accepting credentials or insecure hosts', () => {
    vi.stubEnv('VITE_WEATHER_SERVER_URL', 'https://backend.example/');
    expect(weatherEndpoint('api/open-meteo/v1/forecast').href).toBe(
      'https://backend.example/api/open-meteo/v1/forecast',
    );
    for (const value of [
      'http://untrusted.example/',
      'https://user:secret@backend.example/',
      'https://backend.example/?key=secret',
    ]) {
      vi.stubEnv('VITE_WEATHER_SERVER_URL', value);
      expect(() => weatherEndpoint('api/weatherapi/v1/current.json')).toThrow();
    }
  });
});
