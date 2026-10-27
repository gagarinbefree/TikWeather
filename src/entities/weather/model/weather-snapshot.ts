import type { Locale } from '@/shared/locales';
import type { CurrentWeather } from './current-weather';
import type { Forecast, ForecastDay, ForecastHour } from './forecast';

const storageKey = 'tikweather.weather.v1';

export interface WeatherSnapshot {
  readonly version: 1;
  readonly savedAt: number;
  readonly locale: Locale;
  readonly weather: CurrentWeather;
  readonly forecast: Forecast;
}

/**
 * isRecord
 * @param value The value to inspect.
 * @returns Whether the value is a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * isNumber
 * @param value The value to inspect.
 * @returns Whether the value is finite.
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * isCondition
 * @param value The normalized weather condition to inspect.
 * @returns Whether the required condition fields are present.
 */
function isCondition(value: Record<string, unknown>): boolean {
  return (
    isNumber(value['conditionCode']) &&
    typeof value['conditionText'] === 'string' &&
    (value['conditionLocale'] === 'ru' || value['conditionLocale'] === 'en')
  );
}

/**
 * isHour
 * @param value The hourly forecast to inspect.
 * @returns Whether the forecast can be rendered.
 */
function isHour(value: unknown): value is ForecastHour {
  if (!isRecord(value)) return false;
  return (
    isNumber(value['timestamp']) &&
    isNumber(value['temperature']) &&
    isNumber(value['feelsLike']) &&
    isNumber(value['humidity']) &&
    isNumber(value['windSpeed']) &&
    typeof value['windDirection'] === 'string' &&
    isNumber(value['rainChance']) &&
    (value['uv'] === null || isNumber(value['uv'])) &&
    isNumber(value['pressure']) &&
    (value['visibility'] === null || isNumber(value['visibility'])) &&
    typeof value['isDay'] === 'boolean' &&
    isCondition(value)
  );
}

/**
 * isDay
 * @param value The daily forecast to inspect.
 * @returns Whether the forecast can be rendered.
 */
function isDay(value: unknown): value is ForecastDay {
  if (!isRecord(value)) return false;
  return (
    typeof value['date'] === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value['date']) &&
    isNumber(value['maximum']) &&
    isNumber(value['minimum']) &&
    isNumber(value['humidity']) &&
    isNumber(value['windSpeed']) &&
    (value['rainChance'] === null || isNumber(value['rainChance'])) &&
    (value['uv'] === null || isNumber(value['uv'])) &&
    (value['sunrise'] == null || typeof value['sunrise'] === 'string') &&
    (value['sunset'] == null || typeof value['sunset'] === 'string') &&
    (value['intervalHours'] === undefined ||
      value['intervalHours'] === 2 ||
      value['intervalHours'] === 3) &&
    Array.isArray(value['hours']) &&
    value['hours'].every(isHour) &&
    isCondition(value)
  );
}

/**
 * isWeather
 * @param value The current observation to inspect.
 * @returns Whether the observation can be rendered.
 */
function isWeather(value: unknown): value is CurrentWeather {
  if (!isRecord(value)) return false;
  return (
    typeof value['city'] === 'string' &&
    typeof value['region'] === 'string' &&
    typeof value['country'] === 'string' &&
    typeof value['timeZone'] === 'string' &&
    isNumber(value['observedAt']) &&
    isNumber(value['temperature']) &&
    isNumber(value['feelsLike']) &&
    isNumber(value['humidity']) &&
    isNumber(value['windSpeed']) &&
    typeof value['windDirection'] === 'string' &&
    (value['uv'] === null || isNumber(value['uv'])) &&
    isNumber(value['pressure']) &&
    (value['visibility'] === null || isNumber(value['visibility'])) &&
    typeof value['isDay'] === 'boolean' &&
    isCondition(value)
  );
}

/**
 * isSnapshot
 * @param value The stored JSON value to inspect.
 * @returns Whether the value is a supported complete snapshot.
 */
function isSnapshot(value: unknown): value is WeatherSnapshot {
  if (!isRecord(value) || !isRecord(value['forecast'])) return false;
  const forecast = value['forecast'];
  return (
    value['version'] === 1 &&
    isNumber(value['savedAt']) &&
    (value['locale'] === 'ru' || value['locale'] === 'en') &&
    isWeather(value['weather']) &&
    (forecast['intervalHours'] === undefined ||
      forecast['intervalHours'] === 2 ||
      forecast['intervalHours'] === 3) &&
    Array.isArray(forecast['days']) &&
    forecast['days'].every(isDay)
  );
}

/**
 * readWeatherSnapshot
 * @param storage The browser storage provider.
 * @returns The last complete normalized weather snapshot when available.
 */
export function readWeatherSnapshot(storage: Storage = localStorage): WeatherSnapshot | null {
  try {
    const json = storage.getItem(storageKey);
    if (!json) return null;
    const value: unknown = JSON.parse(json);
    return isSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * writeWeatherSnapshot
 * @param value The normalized current observation and available forecast.
 * @param storage The browser storage provider.
 */
export function writeWeatherSnapshot(
  value: WeatherSnapshot,
  storage: Storage = localStorage,
): void {
  try {
    storage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Weather remains available for this session when storage is disabled or full.
  }
}
