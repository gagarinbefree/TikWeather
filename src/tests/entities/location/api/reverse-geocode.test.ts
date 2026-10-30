import { afterEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocode } from '@/entities/location/api/reverse-geocode';

const point = {
  source: 'device',
  latitude: 58.0047,
  longitude: 56.2514,
  countryCode: null,
} as const;
const place = {
  latitude: point.latitude,
  longitude: point.longitude,
  city: 'Perm',
  countryCode: 'RU',
  region: 'Perm Krai',
  names: { ru: 'Пермь', en: 'Perm' },
};
afterEach(() => vi.useRealTimers());

describe('reverse geocoding reserves', () => {
  it('uses BigDataCloud first and never contacts the reserves after success', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ ...point, lookupSource: 'coordinates', countryCode: 'RU', city: 'Пермь' }),
      );
    await expect(reverseGeocode(point, { fetcher })).resolves.toMatchObject({
      city: 'Пермь',
      ...point,
      countryCode: 'RU',
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toContain('api.bigdatacloud.net');
  });

  it('uses the OpenWeatherMap method on our server when BigDataCloud fails', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json(place));
    await expect(reverseGeocode(point, { fetcher })).resolves.toMatchObject({
      ...point,
      countryCode: 'RU',
      city: 'Пермь',
    });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('api.bigdatacloud.net'),
      expect.stringContaining('/api/location/openweathermap/reverse?'),
    ]);
    expect(fetcher.mock.calls[1]?.[0]).toContain('latitude=58.0047&longitude=56.2514');
    expect(fetcher.mock.calls[1]?.[0]).not.toMatch(/appid=|key=/);
  });

  it('uses the separate WeatherAPI method after both earlier sources fail', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json(place));
    await expect(reverseGeocode(point, { fetcher })).resolves.toMatchObject({
      ...point,
      countryCode: 'RU',
      city: 'Пермь',
    });
    expect(fetcher.mock.calls[2]?.[0]).toContain('/api/location/weatherapi/reverse?');
  });

  it('uses the reserves for incomplete names without accepting a different coordinate', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ ...point, lookupSource: 'coordinates', countryCode: 'RU' }),
      )
      .mockResolvedValueOnce(Response.json({ ...place, latitude: 60.1, longitude: 24.9 }))
      .mockResolvedValueOnce(Response.json(place));
    await expect(reverseGeocode(point, { fetcher })).resolves.toMatchObject({
      city: 'Пермь',
      latitude: point.latitude,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('does not start a reserve after caller cancellation', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new TypeError('cancelled'));
    });
    await expect(
      reverseGeocode(point, { fetcher, signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('times out the first service and continues with the same GPS point', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise<Response>(() => undefined))
      .mockResolvedValueOnce(Response.json(place));
    const result = reverseGeocode(point, { fetcher });
    await vi.advanceTimersByTimeAsync(8001);
    await expect(result).resolves.toMatchObject({
      city: 'Пермь',
      latitude: point.latitude,
      longitude: point.longitude,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

it('does not multiply reserve requests when the shared server rejects the entrance', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(Response.json({}, { status: 429 }));
  await expect(reverseGeocode(point, { fetcher })).rejects.toMatchObject({ sharedLimit: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
