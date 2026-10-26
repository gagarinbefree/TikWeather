import { describe, expect, it, vi } from 'vitest';
import type { Forecast, ForecastDay } from '@/entities/weather';
import { longestForecast } from '@/features/forecast';
import { ApiError } from '@/shared/api';

const day: ForecastDay = {
  date: '2026-10-26',
  maximum: 12,
  minimum: 5,
  humidity: 75,
  windSpeed: 18,
  rainChance: 60,
  uv: 2,
  conditionCode: 1009,
  conditionText: 'Overcast',
  conditionLocale: 'en',
  sunrise: '07:45',
  sunset: '17:28',
  hours: [],
};

/**
 * forecast
 * @param count The number of available calendar days.
 * @returns A complete provider forecast for source selection tests.
 */
function forecast(count: number): Forecast {
  return {
    days: Array.from({ length: count }, (_, index) => ({
      ...day,
      date: new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10),
    })),
  };
}

describe('longestForecast', () => {
  it('keeps the longest successful response when later providers fail', async () => {
    const sources = [
      vi.fn().mockResolvedValue(forecast(3)),
      vi.fn().mockResolvedValue(forecast(6)),
      vi.fn().mockRejectedValue(new ApiError('unavailable')),
    ];

    const result = await longestForecast(sources, new AbortController().signal, 16);

    expect(result.days).toHaveLength(6);
    expect(sources.every((source) => source.mock.calls.length === 1)).toBe(true);
  });

  it('stops after a complete sixteen day response', async () => {
    const next = vi.fn().mockResolvedValue(forecast(5));

    const result = await longestForecast(
      [vi.fn().mockResolvedValue(forecast(16)), next],
      new AbortController().signal,
      16,
    );

    expect(result.days).toHaveLength(16);
    expect(next).not.toHaveBeenCalled();
  });

  it('reports the first provider error when no source has weather', async () => {
    await expect(
      longestForecast(
        [
          vi.fn().mockRejectedValue(new ApiError('timeout')),
          vi.fn().mockRejectedValue(new ApiError('unavailable')),
        ],
        new AbortController().signal,
        16,
      ),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });
});
