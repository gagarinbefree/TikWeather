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
import type { Locale } from '@/shared/locales';
import type { CurrentWeather } from '@/entities/weather/model/current-weather';
import type { Forecast, ForecastDay, ForecastHour } from '@/entities/weather/model/forecast';

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

interface MapOptions extends RequestOptions {
  readonly apiKey: string;
  readonly location: LocationQuery;
  readonly locale: Locale;
}

interface MapForecastOptions extends MapOptions {
  readonly timeZone: string;
  readonly days: number;
  readonly now: number;
}

/**
 * point
 * @param location The detected location.
 * @returns Valid coordinates accepted by the provider.
 */
function point(location: LocationQuery): { latitude: number; longitude: number } {
  if (location.source === 'automatic' || !validCoordinates(location.latitude, location.longitude))
    throw new ApiError('unavailable');
  return location;
}

/**
 * endpoint
 * @param path The current or forecast provider path.
 * @param options The coordinates, language and public browser key.
 * @returns An encoded OpenWeatherMap URL.
 */
function endpoint(path: 'weather' | 'forecast', options: MapOptions): string {
  if (!options.apiKey.trim()) throw new ApiError('configuration');
  const location = point(options.location);
  const url = new URL(`https://api.openweathermap.org/data/2.5/${path}`);
  url.search = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    appid: options.apiKey.trim(),
    units: 'metric',
    lang: options.locale,
  }).toString();
  return url.toString();
}

/**
 * epoch
 * @param value The provider Unix timestamp in seconds.
 * @returns A validated absolute instant in milliseconds.
 */
function epoch(value: unknown): number {
  const seconds = numeric(value, 1, 8640000000000);
  if (!Number.isInteger(seconds)) throw new ApiError('invalidResponse');
  return seconds * 1000;
}

/**
 * formatter
 * @param timeZone The location IANA time zone.
 * @returns A formatter for the local forecast calendar.
 */
function formatter(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new ApiError('invalidResponse');
  }
}

/**
 * localTime
 * @param timestamp The absolute provider instant.
 * @param dateTime The location formatter.
 * @returns The local calendar date and hour.
 */
function localTime(
  timestamp: number,
  dateTime: Intl.DateTimeFormat,
): { date: string; hour: number } {
  const parts = dateTime.formatToParts(timestamp);
  const value = (type: string): string => {
    const found = parts.find((part) => part.type === type)?.value;
    if (!found) throw new ApiError('invalidResponse');
    return found;
  };
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  };
}

/**
 * direction
 * @param bearing The wind bearing clockwise from north.
 * @returns A localized compass lookup code.
 */
function direction(bearing: unknown): string {
  const degrees = numeric(bearing, 0, 360);
  return directions[Math.floor(((degrees + 11.25) % 360) / 22.5)] ?? 'N';
}

/**
 * optionalVisibility
 * @param value The optional provider visibility in metres.
 * @returns Kilometres or null when the provider omitted the measurement.
 */
function optionalVisibility(value: unknown): number | null {
  return value === undefined || value === null ? null : numeric(value, 0) / 1000;
}

/**
 * firstCondition
 * @param value The provider condition list.
 * @returns A validated condition code, text and daylight flag.
 */
function firstCondition(value: unknown): { code: number; description: string; isDay: boolean } {
  if (!Array.isArray(value) || value.length === 0) throw new ApiError('invalidResponse');
  const weather = record(value[0]);
  const icon = text(weather['icon']);
  if (!/[dn]$/.test(icon)) throw new ApiError('invalidResponse');
  return {
    code: numeric(weather['id'], 0),
    description: text(weather['description']),
    isDay: icon.endsWith('d'),
  };
}

/**
 * parseCurrent
 * @param payload The untrusted current response.
 * @param location The original detected location.
 * @param locale The requested provider language.
 * @param timeZone The time zone resolved from real coordinates.
 * @returns Current weather ready for the shared card.
 */
function parseCurrent(
  payload: unknown,
  location: LocationQuery,
  locale: Locale,
  timeZone: string,
): CurrentWeather {
  const source = record(payload);
  const main = record(source['main']);
  const wind = record(source['wind']);
  const sys = record(source['sys']);
  const condition = firstCondition(source['weather']);
  const name = text(source['name']);
  return {
    city: location.source !== 'automatic' && location.city?.trim() ? location.city.trim() : name,
    region: location.source !== 'automatic' ? (location.region ?? '') : '',
    country:
      location.source !== 'automatic' && location.countryCode
        ? location.countryCode
        : text(sys['country']),
    timeZone,
    observedAt: epoch(source['dt']),
    temperature: numeric(main['temp'], -150, 100),
    feelsLike: numeric(main['feels_like'], -200, 150),
    humidity: numeric(main['humidity'], 0, 100),
    windSpeed: numeric(wind['speed'], 0) * 3.6,
    windDirection: direction(wind['deg']),
    uv: null,
    pressure: numeric(main['pressure'], 0),
    visibility: optionalVisibility(source['visibility']),
    conditionCode: condition.code,
    conditionText: condition.description,
    conditionLocale: locale,
    isDay: condition.isDay,
  };
}

/**
 * getOpenWeatherMapCurrent
 * @param options The detected location, browser key and cancellable transport.
 * @returns Validated current observations with an offline coordinate time zone.
 */
export async function getOpenWeatherMapCurrent(options: MapOptions): Promise<CurrentWeather> {
  const url = endpoint('weather', options);
  const payload = await requestJson(url, options);
  const coordinates = point(options.location);
  const { default: lookup } = await import('@photostructure/tz-lookup');
  const timeZone = lookup(coordinates.latitude, coordinates.longitude);
  formatter(timeZone);
  return parseCurrent(payload, options.location, options.locale, timeZone);
}

/**
 * parseHour
 * @param value The provider three hour forecast entry.
 * @param locale The requested provider language.
 * @returns A validated hourly card model.
 */
function parseHour(value: unknown, locale: Locale): ForecastHour {
  const source = record(value);
  const main = record(source['main']);
  const wind = record(source['wind']);
  const condition = firstCondition(source['weather']);
  return {
    timestamp: epoch(source['dt']),
    temperature: numeric(main['temp'], -150, 100),
    feelsLike: numeric(main['feels_like'], -200, 150),
    humidity: numeric(main['humidity'], 0, 100),
    windSpeed: numeric(wind['speed'], 0) * 3.6,
    windDirection: direction(wind['deg']),
    rainChance: numeric(source['pop'], 0, 1) * 100,
    uv: null,
    pressure: numeric(main['pressure'], 0),
    visibility: optionalVisibility(source['visibility']),
    conditionCode: condition.code,
    conditionText: condition.description,
    conditionLocale: locale,
    isDay: condition.isDay,
  };
}

/**
 * nextDate
 * @param first The first local calendar date.
 * @param offset The number of following days.
 * @returns An ISO calendar date independent of the browser time zone.
 */
function nextDate(first: string, offset: number): string {
  const date = new Date(`${first}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/**
 * sunTime
 * @param value The provider sunrise or sunset Unix timestamp.
 * @param timeZone The detected IANA time zone.
 * @returns A local twenty four hour clock reading.
 */
function sunTime(value: unknown, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(epoch(value));
}

/**
 * getOpenWeatherMapForecast
 * @param options The location, current time and requested forecast horizon.
 * @returns Available three hour points and derived daily summaries for three days.
 */
export async function getOpenWeatherMapForecast(options: MapForecastOptions): Promise<Forecast> {
  const currentUrl = endpoint('weather', options);
  const forecastUrl = endpoint('forecast', options);
  const [currentPayload, forecastPayload] = await Promise.all([
    requestJson(currentUrl, options),
    requestJson(forecastUrl, options),
  ]);
  const dateTime = formatter(options.timeZone);
  const current = parseCurrent(currentPayload, options.location, options.locale, options.timeZone);
  const today = localTime(options.now, dateTime).date;
  const source = record(forecastPayload);
  const list = source['list'];
  if (!Array.isArray(list) || list.length === 0) throw new ApiError('invalidResponse');
  const grouped = new Map<string, ForecastHour[]>();
  for (const entry of list) {
    const hour = parseHour(entry, options.locale);
    const date = localTime(hour.timestamp, dateTime).date;
    grouped.set(date, [...(grouped.get(date) ?? []), hour]);
  }
  const currentSource = record(currentPayload);
  const solar = record(currentSource['sys']);
  const days: ForecastDay[] = [];
  for (let offset = 0; offset < 16; offset++) {
    const date = nextDate(today, offset);
    const hours = grouped.get(date) ?? [];
    const includesCurrent = offset === 0 && localTime(current.observedAt, dateTime).date === date;
    if (!hours.length && !includesCurrent) break;
    const temperatures = [
      ...hours.map((hour) => hour.temperature),
      ...(includesCurrent ? [current.temperature] : []),
    ];
    const readings = [...hours, ...(includesCurrent ? [current] : [])];
    const representative = hours.length
      ? [...hours].sort(
          (first, second) =>
            Math.abs(localTime(first.timestamp, dateTime).hour - 12) -
            Math.abs(localTime(second.timestamp, dateTime).hour - 12),
        )[0]
      : current;
    if (!representative) throw new ApiError('invalidResponse');
    days.push({
      date,
      maximum: Math.max(...temperatures),
      minimum: Math.min(...temperatures),
      humidity: readings.reduce((sum, item) => sum + item.humidity, 0) / readings.length,
      windSpeed: Math.max(...readings.map((item) => item.windSpeed)),
      rainChance: hours.length ? Math.max(...hours.map((hour) => hour.rainChance)) : null,
      uv: null,
      conditionCode: representative.conditionCode,
      conditionText: representative.conditionText,
      conditionLocale: options.locale,
      sunrise: offset === 0 ? sunTime(solar['sunrise'], options.timeZone) : undefined,
      sunset: offset === 0 ? sunTime(solar['sunset'], options.timeZone) : undefined,
      hours,
    });
  }
  if (days.length === 0) throw new ApiError('invalidResponse');
  return { days, intervalHours: 3 };
}
