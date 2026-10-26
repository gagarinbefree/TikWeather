import {
  ApiError,
  numeric,
  record,
  requestJson,
  text,
  validCoordinates,
  type LocationQuery,
  type RequestOptions,
} from '@/shared/api';
import { conditionLabel, type Locale } from '@/shared/locales';
import type { CurrentWeather } from '@/entities/weather/model/current-weather';
import type { Forecast, ForecastDay, ForecastHour } from '@/entities/weather/model/forecast';

const currentFields =
  'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,uv_index,weather_code,is_day';
const hourlyFields = `${currentFields},precipitation_probability`;
const dailyFields =
  'temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_probability_max,uv_index_max,weather_code,sunrise,sunset';
const directions = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

interface MeteoOptions extends RequestOptions {
  readonly location: LocationQuery;
  readonly locale: Locale;
}

interface MeteoForecastOptions extends MeteoOptions {
  readonly timeZone: string;
  readonly days: 1 | 2 | 3;
}

/**
 * coordinates
 * @param location The detected location requiring real coordinates.
 * @returns Valid latitude and longitude for the provider query.
 */
function coordinates(location: LocationQuery): { latitude: number; longitude: number } {
  if (location.source === 'automatic' || !validCoordinates(location.latitude, location.longitude))
    throw new ApiError('unavailable');
  return location;
}

/**
 * endpoint
 * @param location The detected position.
 * @param timeZone The requested IANA time zone.
 * @param days The number of forecast days when loading forecasts.
 * @returns An encoded Open Meteo URL without credentials.
 */
function endpoint(location: LocationQuery, timeZone: string, days?: 1 | 2 | 3): string {
  const point = coordinates(location);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    timezone: timeZone,
    timeformat: 'unixtime',
    forecast_days: String(days ?? 1),
    ...(days ? { hourly: hourlyFields, daily: dailyFields } : { current: currentFields }),
  }).toString();
  return url.toString();
}

/**
 * epoch
 * @param value The provider Unix timestamp in seconds.
 * @returns The validated absolute timestamp in milliseconds.
 */
function epoch(value: unknown): number {
  const seconds = numeric(value, 1, 8640000000000);
  if (!Number.isInteger(seconds)) throw new ApiError('invalidResponse');
  return seconds * 1000;
}

/**
 * arrayAt
 * @param source The parallel provider arrays.
 * @param field The requested variable.
 * @param index The position of the requested time.
 * @returns A validated weather measurement.
 */
function arrayAt(source: Record<string, unknown>, field: string, index: number): number {
  const values = source[field];
  if (!Array.isArray(values)) throw new ApiError('invalidResponse');
  return numeric(values[index]);
}

/**
 * dateFormatter
 * @param timeZone The weather location time zone.
 * @returns A strict formatter for local calendar dates.
 */
function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new ApiError('invalidResponse');
  }
}

/**
 * localDate
 * @param timestamp An absolute weather forecast instant.
 * @param formatter The location date formatter.
 * @returns The local calendar date.
 */
function localDate(timestamp: number, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(timestamp);
  const part = (type: string): string => {
    const value = parts.find((item) => item.type === type)?.value;
    if (!value) throw new ApiError('invalidResponse');
    return value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * direction
 * @param degrees The wind bearing clockwise from north.
 * @returns A compass code understood by the shared localization resources.
 */
function direction(degrees: number): string {
  if (degrees < 0 || degrees > 360) throw new ApiError('invalidResponse');
  return directions[Math.floor(((degrees + 11.25) % 360) / 22.5)] ?? 'N';
}

/**
 * clock
 * @param value A sunrise or sunset instant or null at polar latitudes.
 * @param timeZone The weather location time zone.
 * @returns A local clock reading or null when the event does not occur.
 */
function clock(value: unknown, timeZone: string): string | null {
  if (value === null) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(epoch(value));
}

/**
 * getOpenMeteoCurrent
 * @param options The detected coordinates and cancellable transport.
 * @returns Current measurements normalized for the shared weather card.
 */
export async function getOpenMeteoCurrent(options: MeteoOptions): Promise<CurrentWeather> {
  const payload = record(await requestJson(endpoint(options.location, 'auto'), options));
  const current = record(payload['current']);
  const timeZone = text(payload['timezone']);
  dateFormatter(timeZone);
  const code = numeric(current['weather_code'], 0, 99);
  const isDay = numeric(current['is_day'], 0, 1) === 1;
  const point = coordinates(options.location);
  return {
    city:
      options.location.source !== 'automatic' && options.location.city?.trim()
        ? options.location.city.trim()
        : `${point.latitude.toFixed(2)}, ${point.longitude.toFixed(2)}`,
    region: options.location.source !== 'automatic' ? (options.location.region ?? '') : '',
    country: options.location.source !== 'automatic' ? (options.location.countryCode ?? '') : '',
    timeZone,
    observedAt: epoch(current['time']),
    temperature: numeric(current['temperature_2m'], -150, 100),
    feelsLike: numeric(current['apparent_temperature'], -200, 150),
    humidity: numeric(current['relative_humidity_2m'], 0, 100),
    windSpeed: numeric(current['wind_speed_10m'], 0),
    windDirection: direction(numeric(current['wind_direction_10m'], 0, 360)),
    uv: numeric(current['uv_index'], 0),
    pressure: numeric(current['pressure_msl'], 0),
    visibility: numeric(current['visibility'], 0) / 1000,
    conditionCode: code,
    conditionText: conditionLabel(code, isDay, options.locale),
    conditionLocale: options.locale,
    isDay,
  };
}

/**
 * getOpenMeteoForecast
 * @param options The detected location, time zone and requested horizon.
 * @returns Hourly and daily weather normalized for the shared forecast cards.
 */
export async function getOpenMeteoForecast(options: MeteoForecastOptions): Promise<Forecast> {
  const payload = record(
    await requestJson(endpoint(options.location, options.timeZone, options.days), options),
  );
  if (text(payload['timezone']) !== options.timeZone) throw new ApiError('invalidResponse');
  const hourly = record(payload['hourly']);
  const daily = record(payload['daily']);
  const formatter = dateFormatter(options.timeZone);
  const times = hourly['time'];
  const dayTimes = daily['time'];
  if (!Array.isArray(times) || !Array.isArray(dayTimes) || dayTimes.length < options.days)
    throw new ApiError('invalidResponse');
  const hours = new Map<string, ForecastHour[]>();
  for (let index = 0; index < times.length; index++) {
    const timestamp = epoch(times[index]);
    const date = localDate(timestamp, formatter);
    const code = arrayAt(hourly, 'weather_code', index);
    const isDay = arrayAt(hourly, 'is_day', index) === 1;
    const hour: ForecastHour = {
      timestamp,
      temperature: arrayAt(hourly, 'temperature_2m', index),
      feelsLike: arrayAt(hourly, 'apparent_temperature', index),
      humidity: arrayAt(hourly, 'relative_humidity_2m', index),
      windSpeed: arrayAt(hourly, 'wind_speed_10m', index),
      windDirection: direction(arrayAt(hourly, 'wind_direction_10m', index)),
      rainChance: arrayAt(hourly, 'precipitation_probability', index),
      uv: arrayAt(hourly, 'uv_index', index),
      pressure: arrayAt(hourly, 'pressure_msl', index),
      visibility: arrayAt(hourly, 'visibility', index) / 1000,
      conditionCode: code,
      conditionText: conditionLabel(code, isDay, options.locale),
      conditionLocale: options.locale,
      isDay,
    };
    hours.set(date, [...(hours.get(date) ?? []), hour]);
  }
  const offset = numeric(payload['utc_offset_seconds'], -50400, 50400);
  const days: ForecastDay[] = [];
  for (let index = 0; index < options.days; index++) {
    const date = new Date(epoch(dayTimes[index]) + offset * 1000).toISOString().slice(0, 10);
    const code = arrayAt(daily, 'weather_code', index);
    const dayHours = hours.get(date);
    if (!dayHours?.length) throw new ApiError('invalidResponse');
    days.push({
      date,
      maximum: arrayAt(daily, 'temperature_2m_max', index),
      minimum: arrayAt(daily, 'temperature_2m_min', index),
      humidity: arrayAt(daily, 'relative_humidity_2m_mean', index),
      windSpeed: arrayAt(daily, 'wind_speed_10m_max', index),
      rainChance: arrayAt(daily, 'precipitation_probability_max', index),
      uv: arrayAt(daily, 'uv_index_max', index),
      conditionCode: code,
      conditionText: conditionLabel(code, true, options.locale),
      conditionLocale: options.locale,
      sunrise: clock(
        Array.isArray(daily['sunrise']) ? daily['sunrise'][index] : undefined,
        options.timeZone,
      ),
      sunset: clock(
        Array.isArray(daily['sunset']) ? daily['sunset'][index] : undefined,
        options.timeZone,
      ),
      hours: dayHours,
    });
  }
  return { days, intervalHours: 2 };
}
