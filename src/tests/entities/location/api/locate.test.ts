import { afterEach, describe, expect, it, vi } from 'vitest';
import { locate, type DeviceGeolocation } from '@/entities/location';

const ip = { latitude: '58.0047', longitude: '56.2514', country_code: 'RU', city: 'Perm' };
afterEach(() => vi.useRealTimers());

describe('locate', () => {
  it('resolves a Russian city and country from valid device coordinates', async () => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 58.0047, longitude: 56.2514 } });
      },
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        latitude: 58.0047,
        longitude: 56.2514,
        lookupSource: 'coordinates',
        countryCode: 'RU',
        city: 'Пермь',
        principalSubdivision: 'Пермский край',
      }),
    );
    await expect(locate({ device, fetcher })).resolves.toEqual({
      source: 'device',
      latitude: 58.0047,
      longitude: 56.2514,
      countryCode: 'RU',
      city: 'Пермь',
      region: 'Пермский край',
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toContain('reverse-geocode-client');
    expect(fetcher.mock.calls[0]?.[0]).toContain('localityLanguage=default');
  });

  it('reports a location failure when device coordinates have no city or country', async () => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 60.1, longitude: 24.9 } });
      },
    };
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network'));
    await expect(locate({ device, fetcher })).rejects.toMatchObject({ kind: 'location' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not replace device location with a different IP based place', async () => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 58.0047, longitude: 56.2514 } });
      },
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        latitude: 60.1,
        longitude: 24.9,
        lookupSource: 'coordinates',
        countryCode: 'FI',
        city: 'Helsinki',
      }),
    );
    await expect(locate({ device, fetcher })).rejects.toMatchObject({ kind: 'location' });
  });

  it('ignores an IP fallback reported by the reverse geocoder', async () => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 58.0047, longitude: 56.2514 } });
      },
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        latitude: 58.0047,
        longitude: 56.2514,
        lookupSource: 'ip',
        countryCode: 'FI',
        city: 'Turku',
      }),
    );
    await expect(locate({ device, fetcher })).rejects.toMatchObject({ kind: 'location' });
  });

  it('falls back immediately when permission is denied', async () => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (_success, failure) => {
        failure();
      },
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(ip));
    await expect(locate({ device, fetcher })).resolves.toEqual({
      source: 'ip',
      latitude: 58.0047,
      longitude: 56.2514,
      countryCode: 'RU',
      city: 'Perm',
    });
  });

  it('retains GeoJS place names for keyless weather fallback', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ...ip, city: 'Perm', region: 'Perm Krai' }));
    await expect(locate({ device: null, fetcher })).resolves.toMatchObject({
      city: 'Perm',
      region: 'Perm Krai',
    });
  });

  it('bounds a permission prompt that never completes and ignores its late answer', async () => {
    vi.useFakeTimers();
    const device: DeviceGeolocation = { getCurrentPosition: vi.fn() };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(ip));
    const result = locate({ device, fetcher, deviceTimeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toMatchObject({ source: 'ip' });
  });

  it.each([NaN, 91, Infinity])('rejects invalid device latitude %s', async (latitude) => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (success) => {
        success({ coords: { latitude, longitude: 0 } });
      },
    };
    await expect(
      locate({ device, fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(ip)) }),
    ).resolves.toMatchObject({ source: 'ip' });
  });

  it('keeps valid zero coordinates and reports failed IP detection', async () => {
    await expect(
      locate({
        device: {
          getCurrentPosition: (success) => {
            success({ coords: { latitude: 0, longitude: 0 } });
          },
        },
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(
          Response.json({
            latitude: 0,
            longitude: 0,
            lookupSource: 'coordinates',
            countryCode: 'GH',
            city: 'Test place',
          }),
        ),
      }),
    ).resolves.toMatchObject({ source: 'device', latitude: 0 });
    await expect(
      locate({
        device: null,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ latitude: '' })),
      }),
    ).rejects.toMatchObject({ kind: 'location' });
  });

  it('never starts the IP fallback after cancellation', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>();
    const result = locate({
      device: { getCurrentPosition: vi.fn() },
      fetcher,
      signal: controller.signal,
    });
    controller.abort();
    await expect(result).rejects.toMatchObject({ kind: 'cancelled' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

it('waits for city and country longer than the former short geocoding timeout', async () => {
  vi.useFakeTimers();
  const device: DeviceGeolocation = {
    getCurrentPosition: (success) => {
      success({ coords: { latitude: 58, longitude: 56.25 } });
    },
  };
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            Response.json({
              latitude: 58,
              longitude: 56.25,
              lookupSource: 'coordinates',
              countryCode: 'RU',
              city: 'Perm',
            }),
          );
        }, 2500);
      }),
  );
  const result = locate({ device, fetcher });
  const check = expect(result).resolves.toMatchObject({ city: 'Perm', countryCode: 'RU' });
  await Promise.all([vi.advanceTimersByTimeAsync(2600), check]);
});

it('rejects a location with no city instead of publishing coordinates as its name', async () => {
  const device: DeviceGeolocation = {
    getCurrentPosition: (success) => {
      success({ coords: { latitude: 58, longitude: 56.25 } });
    },
  };
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      latitude: 58,
      longitude: 56.25,
      lookupSource: 'coordinates',
      countryCode: 'RU',
    }),
  );
  await expect(locate({ device, fetcher })).rejects.toMatchObject({ kind: 'location' });
});
