import { defineComponent, inject } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountWeatherApp } from '@/app/bootstrap';
import { currentWeatherServicesKey, type CurrentWeatherServices } from '@/features/current-weather';
import { forecastServicesKey, type ForecastServices } from '@/features/forecast';
import {
  getCurrentWeather,
  getForecast,
  getOpenMeteoCurrent,
  getOpenMeteoForecast,
  getOpenWeatherMapCurrent,
  getOpenWeatherMapForecast,
  type CurrentWeather,
  type Forecast,
} from '@/entities/weather';
import { ApiError } from '@/shared/api';

vi.mock(import('@/entities/weather'), async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentWeather: vi.fn(),
  getForecast: vi.fn(),
  getOpenMeteoCurrent: vi.fn(),
  getOpenMeteoForecast: vi.fn(),
  getOpenWeatherMapCurrent: vi.fn(),
  getOpenWeatherMapForecast: vi.fn(),
}));

const location = { source: 'device', latitude: 58, longitude: 56.25, countryCode: 'RU' } as const;
const signal = new AbortController().signal;
const now = Date.UTC(2026, 9, 26, 7);
const weather: CurrentWeather = {
  city: 'Perm',
  region: '',
  country: 'RU',
  timeZone: 'Asia/Yekaterinburg',
  observedAt: now,
  temperature: 9,
  feelsLike: 7,
  humidity: 70,
  windSpeed: 12,
  windDirection: 'SW',
  uv: 1,
  pressure: 1012,
  visibility: 10,
  conditionCode: 3,
  conditionText: 'Overcast',
  conditionLocale: 'en',
  isDay: true,
};

/**
 * forecast. Create calendar days with the source and its real hourly spacing
 *
 * @param count The number of available calendar days.
 * @param provider The weather service that supplied the readings.
 * @returns Normalized weather for provider ordering tests.
 */
function forecast(
  count: number,
  provider: 'open-meteo' | 'weatherapi' | 'openweathermap',
): Forecast {
  return {
    intervalHours: provider === 'openweathermap' ? 3 : 2,
    days: Array.from({ length: count }, (_, index) => ({
      provider,
      date: new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10),
      maximum: 12,
      minimum: 5,
      humidity: 70,
      windSpeed: 12,
      rainChance: 20,
      uv: 1,
      conditionCode: 3,
      conditionText: provider,
      conditionLocale: 'en',
      sunrise: '07:45',
      sunset: '17:30',
      hours: Array.from({ length: provider === 'open-meteo' ? 1 : 2 }, (_, hour) => ({
        timestamp: now + index * 86_400_000 + hour * 3_600_000,
        temperature: 9,
        feelsLike: 7,
        humidity: 70,
        windSpeed: 12,
        windDirection: 'SW',
        rainChance: 20,
        uv: 1,
        pressure: 1012,
        visibility: 10,
        conditionCode: 3,
        conditionText: provider,
        conditionLocale: 'en' as const,
        isDay: true,
      })),
    })),
  };
}

/**
 * services. Read the real services supplied to the mounted application
 *
 * @returns The current and forecast services used by every platform.
 */
function services(): { current: CurrentWeatherServices; forecast: ForecastServices } {
  let current: CurrentWeatherServices | undefined;
  let forecast: ForecastServices | undefined;
  mountWeatherApp(
    defineComponent({
      setup() {
        current = inject(currentWeatherServicesKey);
        forecast = inject(forecastServicesKey);
        return (): null => null;
      },
    }),
  );
  if (!current || !forecast) throw new Error('Missing application services');
  return { current, forecast };
}

beforeEach(() => {
  vi.resetAllMocks();
  document.body.innerHTML = '<div id="app"></div>';
  vi.mocked(getOpenMeteoCurrent).mockResolvedValue(weather);
  vi.mocked(getCurrentWeather).mockResolvedValue(weather);
  vi.mocked(getOpenWeatherMapCurrent).mockResolvedValue(weather);
  vi.mocked(getOpenMeteoForecast).mockResolvedValue(forecast(16, 'open-meteo'));
  vi.mocked(getForecast).mockResolvedValue(forecast(14, 'weatherapi'));
  vi.mocked(getOpenWeatherMapForecast).mockResolvedValue(forecast(5, 'openweathermap'));
});

describe('application weather provider order', () => {
  it('loads current weather from Open Meteo without calling healthy backups', async () => {
    const result = await services().current.current(location, 'en', signal);
    expect(result).toEqual(weather);
    expect(getOpenMeteoCurrent).toHaveBeenCalledOnce();
    expect(getCurrentWeather).not.toHaveBeenCalled();
    expect(getOpenWeatherMapCurrent).not.toHaveBeenCalled();
  });

  it('tries WeatherAPI and then OpenWeatherMap when earlier current sources fail', async () => {
    vi.mocked(getOpenMeteoCurrent).mockRejectedValue(new ApiError('timeout'));
    vi.mocked(getCurrentWeather).mockRejectedValue(new ApiError('unavailable'));
    await services().current.current(location, 'en', signal);
    expect(vi.mocked(getOpenMeteoCurrent).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getCurrentWeather).mock.invocationCallOrder[0] ?? 0,
    );
    expect(vi.mocked(getCurrentWeather).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getOpenWeatherMapCurrent).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each([1, 3] as const)('loads the first %i forecast days from Open Meteo', async (days) => {
    await services().forecast.forecast(location, 'en', weather.timeZone, days, now, signal);
    expect(getOpenMeteoForecast).toHaveBeenCalledWith(expect.objectContaining({ days }));
    expect(getForecast).not.toHaveBeenCalled();
    expect(getOpenWeatherMapForecast).not.toHaveBeenCalled();
  });

  it('uses WeatherAPI before OpenWeatherMap when Open Meteo forecast fails', async () => {
    vi.mocked(getOpenMeteoForecast).mockRejectedValue(new ApiError('timeout'));
    await services().forecast.forecast(location, 'en', weather.timeZone, 3, now, signal);
    expect(getForecast).toHaveBeenCalledOnce();
    expect(getOpenWeatherMapForecast).not.toHaveBeenCalled();
  });

  it('keeps primary days and adds missing later days from backups', async () => {
    vi.mocked(getOpenMeteoForecast).mockResolvedValue(forecast(3, 'open-meteo'));
    const result = await services().forecast.forecast(
      location,
      'en',
      weather.timeZone,
      16,
      now,
      signal,
    );
    expect(result.days).toHaveLength(14);
    expect(result.days.slice(0, 3).map((day) => day.conditionText)).toEqual(
      Array(3).fill('open-meteo'),
    );
    expect(result.days.slice(3).every((day) => day.conditionText === 'weatherapi')).toBe(true);
    expect(vi.mocked(getOpenMeteoForecast).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getForecast).mock.invocationCallOrder[0] ?? 0,
    );
    expect(vi.mocked(getForecast).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getOpenWeatherMapForecast).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('stops after a fresh complete sixteen day Open Meteo forecast', async () => {
    const result = await services().forecast.forecast(
      location,
      'en',
      weather.timeZone,
      16,
      now,
      signal,
    );
    expect(result.days).toHaveLength(16);
    expect(getForecast).not.toHaveBeenCalled();
    expect(getOpenWeatherMapForecast).not.toHaveBeenCalled();
  });
});
