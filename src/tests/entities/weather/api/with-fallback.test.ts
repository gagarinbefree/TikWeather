import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api';
import { withFallback } from '@/entities/weather';

describe('withFallback', () => {
  it('tries providers in order and stops after the first successful response', async () => {
    const first = vi.fn().mockRejectedValue(new ApiError('timeout'));
    const second = vi.fn().mockResolvedValue('open-meteo');
    const third = vi.fn().mockResolvedValue('open-weather-map');
    await expect(withFallback([first, second, third], new AbortController().signal)).resolves.toBe(
      'open-meteo',
    );
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(third).not.toHaveBeenCalled();
  });

  it('uses the third provider after failures from the first two', async () => {
    const sources = [
      (): Promise<string> => Promise.reject(new ApiError('credentials')),
      (): Promise<string> => Promise.reject(new ApiError('connection')),
      (): Promise<string> => Promise.resolve('open-weather-map'),
    ];
    await expect(withFallback(sources, new AbortController().signal)).resolves.toBe(
      'open-weather-map',
    );
  });

  it('never starts another provider after caller cancellation', async () => {
    const controller = new AbortController();
    const second = vi.fn().mockResolvedValue('unexpected');
    const first = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new ApiError('cancelled'));
    });
    await expect(withFallback([first, second], controller.signal)).rejects.toMatchObject({
      kind: 'cancelled',
    });
    expect(second).not.toHaveBeenCalled();
  });

  it('preserves the primary error if all backups fail', async () => {
    await expect(
      withFallback(
        [
          (): Promise<string> => Promise.reject(new ApiError('timeout')),
          (): Promise<string> => Promise.reject(new ApiError('configuration')),
        ],
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });
  it('tries fresh backups before returning a server snapshot and keeps the newest snapshot', async () => {
    const stale = vi.fn().mockResolvedValue({ temperature: 1, serverCachedAt: 100 });
    const live = vi.fn().mockResolvedValue({ temperature: 2 });
    const third = vi.fn().mockResolvedValue({ temperature: 3, serverCachedAt: 200 });
    await expect(withFallback([stale, live, third], new AbortController().signal)).resolves.toEqual(
      { temperature: 2 },
    );
    expect(live).toHaveBeenCalledOnce();
    expect(third).not.toHaveBeenCalled();
    await expect(withFallback([stale, third], new AbortController().signal)).resolves.toEqual({
      temperature: 3,
      serverCachedAt: 200,
    });
  });
  it('stops at a shared backend limit instead of retrying other routes on the same server', async () => {
    const backup = vi.fn().mockResolvedValue('unexpected');
    const source = vi.fn().mockRejectedValue(new ApiError('unavailable', 429, true));
    await expect(
      withFallback([source, backup], new AbortController().signal),
    ).rejects.toMatchObject({ status: 429 });
    expect(backup).not.toHaveBeenCalled();
  });
});
