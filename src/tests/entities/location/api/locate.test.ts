import { afterEach, describe, expect, it, vi } from 'vitest';
import { locate, type DeviceGeolocation } from '@/entities/location';

const ip = { latitude: '58.0047', longitude: '56.2514', country_code: 'RU' };
afterEach(() => vi.useRealTimers());

describe('locate', () => {
  it('uses valid device coordinates without contacting GeoJS', async () => {
    const device: DeviceGeolocation = {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 60.1, longitude: 24.9 } });
      },
    };
    const fetcher = vi.fn<typeof fetch>();
    await expect(locate({ device, fetcher })).resolves.toEqual({
      source: 'device',
      latitude: 60.1,
      longitude: 24.9,
      countryCode: null,
    });
    expect(fetcher).not.toHaveBeenCalled();
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

  it('keeps valid zero coordinates and falls back to provider IP detection if GeoJS fails', async () => {
    await expect(
      locate({
        device: {
          getCurrentPosition: (success) => {
            success({ coords: { latitude: 0, longitude: 0 } });
          },
        },
      }),
    ).resolves.toMatchObject({ source: 'device', latitude: 0 });
    await expect(
      locate({
        device: null,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ latitude: '' })),
      }),
    ).resolves.toEqual({ source: 'automatic' });
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
