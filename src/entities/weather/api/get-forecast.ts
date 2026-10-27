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
import type { Forecast, ForecastDay, ForecastHour } from '@/entities/weather/model/forecast';

interface ForecastOptions extends RequestOptions {
  readonly apiKey: string;
  readonly location: LocationQuery;
  readonly locale: 'ru' | 'en';
  readonly timeZone: string;
  readonly days: number;
}

/**
 * localDate. Read the local date of a timestamp
 *
 * @param timestamp The provider hour as milliseconds since the Unix epoch.
 * @param formatter The formatter for the weather location.
 * @returns The calendar date of the hour at the weather location.
 */
function localDate(timestamp: number, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(timestamp);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new ApiError('invalidResponse');
  return `${year}-${month}-${day}`;
}

/**
 * clockTime. Convert an astronomy time to twenty four hour time
 *
 * @param value The provider astronomy time with an AM or PM suffix.
 * @param absent The expected phrase for a polar day without this sun event.
 * @returns The same clock time in twenty four hour format or null for no event.
 */
function clockTime(value: unknown, absent: 'No sunrise' | 'No sunset'): string | null {
  const source = text(value);
  if (source.toLowerCase() === absent.toLowerCase()) return null;
  const match = /^(0?[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/.exec(source);
  if (!match?.[1] || !match[2] || !match[3]) throw new ApiError('invalidResponse');
  const hour = (Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

/**
 * parseHour. Read and validate one forecast reading
 *
 * @param value The untrusted provider hour.
 * @param date The expected local date.
 * @param formatter The location date formatter.
 * @param locale The requested condition language.
 * @returns A validated hourly forecast.
 */
function parseHour(
  value: unknown,
  date: string,
  formatter: Intl.DateTimeFormat,
  locale: 'ru' | 'en',
): ForecastHour {
  const source = record(value);
  const timestamp = numeric(source['time_epoch'], 1, 8640000000000) * 1000;
  if (!Number.isInteger(timestamp) || localDate(timestamp, formatter) !== date)
    throw new ApiError('invalidResponse');
  const condition = record(source['condition']);
  return {
    timestamp,
    temperature: numeric(source['temp_c'], -150, 100),
    feelsLike: numeric(source['feelslike_c'], -200, 150),
    humidity: numeric(source['humidity'], 0, 100),
    windSpeed: numeric(source['wind_kph'], 0),
    windDirection: text(source['wind_dir']),
    rainChance: numeric(source['chance_of_rain'], 0, 100),
    uv: numeric(source['uv'], 0),
    pressure: numeric(source['pressure_mb'], 0),
    visibility: numeric(source['vis_km'], 0),
    conditionCode: numeric(condition['code'], 0),
    conditionText: text(condition['text']),
    conditionLocale: locale,
    isDay: numeric(source['is_day'], 0, 1) === 1,
  };
}

/**
 * parseDay. Read and validate one day of weather and sun times
 *
 * @param value The untrusted provider day.
 * @param formatter The location date formatter.
 * @param locale The requested condition language.
 * @returns A validated daily forecast with its hourly readings.
 */
function parseDay(
  value: unknown,
  formatter: Intl.DateTimeFormat,
  locale: 'ru' | 'en',
): ForecastDay {
  const source = record(value);
  const date = text(source['date']);
  const dateValue = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(dateValue.getTime()) ||
    dateValue.toISOString().slice(0, 10) !== date
  )
    throw new ApiError('invalidResponse');
  const day = record(source['day']);
  const astro = record(source['astro']);
  const condition = record(day['condition']);
  const hours = source['hour'];
  if (!Array.isArray(hours) || hours.length === 0) throw new ApiError('invalidResponse');
  return {
    date,
    maximum: numeric(day['maxtemp_c'], -150, 100),
    minimum: numeric(day['mintemp_c'], -150, 100),
    humidity: numeric(day['avghumidity'], 0, 100),
    windSpeed: numeric(day['maxwind_kph'], 0),
    rainChance: numeric(day['daily_chance_of_rain'], 0, 100),
    uv: numeric(day['uv'], 0),
    conditionCode: numeric(condition['code'], 0),
    conditionText: text(condition['text']),
    conditionLocale: locale,
    sunrise: clockTime(astro['sunrise'], 'No sunrise'),
    sunset: clockTime(astro['sunset'], 'No sunset'),
    hours: hours.map((hour: unknown) => parseHour(hour, date, formatter, locale)),
  };
}

/**
 * getForecast. Load daily and hourly forecasts from WeatherAPI
 *
 * @param options The detected position, forecast horizon and WeatherAPI transport.
 * @returns Validated daily and hourly weather for the requested horizon.
 */
export async function getForecast(options: ForecastOptions): Promise<Forecast> {
  if (!options.apiKey.trim()) throw new ApiError('configuration');
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 14)
    throw new ApiError('invalidResponse');
  const position = options.location;
  if (position.source !== 'automatic' && !validCoordinates(position.latitude, position.longitude))
    throw new ApiError('invalidResponse');
  const query =
    position.source === 'automatic'
      ? 'auto:ip'
      : `${position.latitude.toString()},${position.longitude.toString()}`;
  const url = new URL('https://api.weatherapi.com/v1/forecast.json');
  url.search = new URLSearchParams({
    key: options.apiKey.trim(),
    q: query,
    days: String(options.days),
    lang: options.locale,
    aqi: 'no',
    alerts: 'no',
  }).toString();
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: options.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    throw new ApiError('invalidResponse');
  }
  const payload = record(await requestJson(url.toString(), options));
  const forecast = record(payload['forecast']);
  const entries = forecast['forecastday'];
  if (!Array.isArray(entries) || entries.length === 0) throw new ApiError('invalidResponse');
  const days = entries
    .slice(0, options.days)
    .map((entry: unknown) => parseDay(entry, formatter, options.locale));
  if (new Set(days.map((day) => day.date)).size !== days.length)
    throw new ApiError('invalidResponse');
  return { days };
}
