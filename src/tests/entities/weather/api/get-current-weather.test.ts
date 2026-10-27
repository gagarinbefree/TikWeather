import { describe, expect, it, vi } from 'vitest';
import { getCurrentWeather } from '@/entities/weather';
import { currentResponse } from './current-fixture';

describe('getCurrentWeather', () => {
  it('loads current weather directly using coordinates and language', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse));
    const weather = await getCurrentWeather({
      location: {
        source: 'device',
        latitude: 58.0047,
        longitude: 56.2514,
        countryCode: null,
      },
      locale: 'ru',
      apiKey: 'example-only',
      fetcher,
    });
    const requested = fetcher.mock.calls[0]?.[0];
    if (typeof requested !== 'string') throw new Error('Expected a string API URL');
    const url = new URL(requested);
    expect(url.pathname).toBe('/v1/current.json');
    expect(url.searchParams.get('q')).toBe('58.0047,56.2514');
    expect(url.searchParams.get('lang')).toBe('ru');
    expect(weather).toMatchObject({
      city: 'Perm',
      timeZone: 'Asia/Yekaterinburg',
      observedAt: currentResponse.current.last_updated_epoch * 1000,
      temperature: 8.9,
      conditionCode: 1009,
      isDay: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('supports auto IP without a hardcoded city', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse));
    await getCurrentWeather({
      location: { source: 'automatic' },
      locale: 'en',
      apiKey: 'example-only',
      fetcher,
    });
    const requested = fetcher.mock.calls[0]?.[0];
    if (typeof requested !== 'string') throw new Error('Expected a string API URL');
    expect(new URL(requested).searchParams.get('q')).toBe('auto:ip');
  });

  it('uses the localized device city instead of the provider transliteration', async () => {
    const weather = await getCurrentWeather({
      location: {
        source: 'device',
        latitude: 58.0047,
        longitude: 56.2514,
        countryCode: 'RU',
        city: 'Пермь',
        region: 'Пермский край',
      },
      locale: 'ru',
      apiKey: 'example-only',
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
    });
    expect(weather.city).toBe('Пермь');
    expect(weather.region).toBe('Пермский край');
  });

  it('fails clearly without a key and does not send a useless request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      getCurrentWeather({ location: { source: 'automatic' }, locale: 'en', apiKey: '', fetcher }),
    ).rejects.toMatchObject({ kind: 'configuration' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { ...currentResponse, location: { ...currentResponse.location, tz_id: 'invalid/zone' } },
    { ...currentResponse, current: { ...currentResponse.current, temp_c: '8.9' } },
    { ...currentResponse, current: { ...currentResponse.current, humidity: 101 } },
    { ...currentResponse, current: { ...currentResponse.current, last_updated_epoch: null } },
  ])('rejects incomplete or invalid payloads', async (payload) => {
    await expect(
      getCurrentWeather({
        location: { source: 'automatic' },
        locale: 'en',
        apiKey: 'example-only',
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload)),
      }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });
});
