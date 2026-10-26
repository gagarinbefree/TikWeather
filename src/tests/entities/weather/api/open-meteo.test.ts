import { describe, expect, it, vi } from 'vitest';
import { getOpenMeteoCurrent, getOpenMeteoForecast } from '@/entities/weather';

const location = {
  source: 'ip' as const,
  latitude: 58,
  longitude: 56.25,
  countryCode: 'RU',
  city: 'Perm',
};

const response = {
  timezone: 'Asia/Yekaterinburg',
  utc_offset_seconds: 18000,
  current: {
    time: Date.UTC(2026, 9, 26, 7) / 1000,
    temperature_2m: 9,
    apparent_temperature: 7,
    relative_humidity_2m: 70,
    wind_speed_10m: 12,
    wind_direction_10m: 225,
    pressure_msl: 1012,
    visibility: 10000,
    uv_index: 1,
    weather_code: 3,
    is_day: 1,
  },
  hourly: {
    time: [Date.UTC(2026, 9, 26, 7) / 1000],
    temperature_2m: [9],
    apparent_temperature: [7],
    relative_humidity_2m: [70],
    wind_speed_10m: [12],
    wind_direction_10m: [225],
    pressure_msl: [1012],
    visibility: [10000],
    uv_index: [1],
    weather_code: [3],
    is_day: [1],
    precipitation_probability: [40],
  },
  daily: {
    time: [Date.UTC(2026, 9, 25, 19) / 1000],
    temperature_2m_max: [12],
    temperature_2m_min: [4],
    relative_humidity_2m_mean: [75],
    wind_speed_10m_max: [18],
    precipitation_probability_max: [60],
    uv_index_max: [2],
    weather_code: [3],
    sunrise: [Date.UTC(2026, 9, 26, 2, 45) / 1000],
    sunset: [Date.UTC(2026, 9, 26, 12, 30) / 1000],
  },
};

describe('Open Meteo adapter', () => {
  it('maps the current response to the shared weather card model', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response));
    const current = await getOpenMeteoCurrent({ location, locale: 'ru', fetcher });
    const requestUrl = fetcher.mock.calls[0]?.[0];
    if (typeof requestUrl !== 'string') throw new Error('Expected a URL');
    const url = new URL(requestUrl);
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('current')).toContain('temperature_2m');
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    expect(current).toMatchObject({
      city: 'Perm',
      country: 'RU',
      timeZone: 'Asia/Yekaterinburg',
      observedAt: Date.UTC(2026, 9, 26, 7),
      temperature: 9,
      windDirection: 'SW',
      conditionCode: 3,
      conditionText: 'Пасмурно',
    });
  });

  it('maps real hourly instants and daily dates in the location timezone', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response));
    const forecast = await getOpenMeteoForecast({
      location,
      locale: 'ru',
      timeZone: 'Asia/Yekaterinburg',
      days: 1,
      fetcher,
    });
    const requestUrl = fetcher.mock.calls[0]?.[0];
    if (typeof requestUrl !== 'string') throw new Error('Expected a URL');
    const url = new URL(requestUrl);
    expect(url.searchParams.get('forecast_days')).toBe('1');
    expect(forecast.intervalHours).toBe(2);
    expect(forecast.days[0]).toMatchObject({
      date: '2026-10-26',
      maximum: 12,
      minimum: 4,
      sunrise: '07:45',
      sunset: '17:30',
      hours: [
        {
          timestamp: Date.UTC(2026, 9, 26, 7),
          temperature: 9,
          rainChance: 40,
          visibility: 10,
        },
      ],
    });
  });

  it('rejects an incomplete response without displaying provider fields', async () => {
    await expect(
      getOpenMeteoForecast({
        location,
        locale: 'en',
        timeZone: 'Asia/Yekaterinburg',
        days: 1,
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ ...response, hourly: {} })),
      }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });
});
