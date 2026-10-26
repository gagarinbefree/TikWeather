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
});
