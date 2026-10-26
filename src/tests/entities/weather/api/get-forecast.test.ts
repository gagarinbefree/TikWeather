import { describe, expect, it, vi } from 'vitest';
import { getForecast } from '@/entities/weather';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

describe('getForecast', () => {
  it('accepts the shorter horizon returned for a large request', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(forecastResponse));

    const forecast = await getForecast({
      apiKey: 'example-only',
      location: { source: 'device', latitude: 58, longitude: 56.25, countryCode: null },
      locale: 'ru',
      timeZone: 'Asia/Yekaterinburg',
      days: 14,
      fetcher,
    });

    expect(forecast.days).toHaveLength(3);
    const requestUrl = fetcher.mock.calls[0]?.[0];
    if (typeof requestUrl !== 'string') throw new Error('Expected a URL');
    expect(new URL(requestUrl).searchParams.get('days')).toBe('14');
  });

  it('requests only the needed horizon and normalizes daily and hourly weather', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        forecast: { forecastday: forecastResponse.forecast.forecastday.slice(0, 2) },
      }),
    );
    const forecast = await getForecast({
      apiKey: 'example-only',
      location: { source: 'device', latitude: 58, longitude: 56.25, countryCode: null },
      locale: 'ru',
      timeZone: 'Asia/Yekaterinburg',
      days: 2,
      fetcher,
    });
    const requestUrl = fetcher.mock.calls[0]?.[0];
    if (typeof requestUrl !== 'string') throw new Error('Expected a WeatherAPI request URL');
    const url = new URL(requestUrl);
    expect(url.pathname).toBe('/v1/forecast.json');
    expect(url.searchParams.get('q')).toBe('58,56.25');
    expect(url.searchParams.get('days')).toBe('2');
    expect(url.searchParams.get('lang')).toBe('ru');
    expect(forecast.days).toHaveLength(2);
    expect(forecast.days[0]).toMatchObject({
      date: '2026-10-26',
      maximum: 12,
      minimum: 5,
      rainChance: 60,
      sunrise: '07:45',
      sunset: '17:28',
      hours: [{ timestamp: Date.UTC(2026, 9, 26, 7), temperature: 9.5, rainChance: 35 }],
    });
  });

  it('rejects missing forecast measurements without exposing provider text', async () => {
    await expect(
      getForecast({
        apiKey: 'example-only',
        location: { source: 'automatic' },
        locale: 'en',
        timeZone: 'Asia/Yekaterinburg',
        days: 1,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(
          Response.json({
            forecast: {
              forecastday: [
                {
                  ...forecastResponse.forecast.forecastday[0],
                  day: { ...forecastResponse.forecast.forecastday[0]?.day, maxtemp_c: null },
                },
              ],
            },
          }),
        ),
      }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });

  it('keeps a polar day usable when the provider reports no sunrise or sunset', async () => {
    const first = forecastResponse.forecast.forecastday[0];
    const forecast = await getForecast({
      apiKey: 'example-only',
      location: { source: 'automatic' },
      locale: 'en',
      timeZone: 'Asia/Yekaterinburg',
      days: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          forecast: {
            forecastday: [{ ...first, astro: { sunrise: 'No sunrise', sunset: 'No sunset' } }],
          },
        }),
      ),
    });
    expect(forecast.days[0]).toMatchObject({ sunrise: null, sunset: null });
  });
});
