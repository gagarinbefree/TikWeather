import {
  ApiError,
  numeric,
  record,
  requestWeatherJson,
  weatherEndpoint,
  text,
  validCoordinates,
  type LocationQuery,
  type RequestOptions,
} from '@/shared/api';
import type { CurrentWeather } from '@/entities/weather/model/current-weather';

interface CurrentWeatherOptions extends RequestOptions {
  readonly location: LocationQuery;
  readonly locale: 'ru' | 'en';
}

/**
 * getCurrentWeather. Load the current weather from WeatherAPI
 *
 * @param options The detected position and configured WeatherAPI transport.
 * @returns The validated current observations independent of forecast loading.
 */
export async function getCurrentWeather(options: CurrentWeatherOptions): Promise<CurrentWeather> {
  const position = options.location;
  if (position.source !== 'automatic' && !validCoordinates(position.latitude, position.longitude))
    throw new ApiError('invalidResponse');
  const query =
    position.source === 'automatic'
      ? 'auto:ip'
      : `${position.latitude.toString()},${position.longitude.toString()}`;
  const url = weatherEndpoint('api/weatherapi/v1/current.json');
  url.search = new URLSearchParams({
    q: query,
    lang: options.locale,
    aqi: 'no',
  }).toString();
  const { payload: body, serverCachedAt } = await requestWeatherJson(url.toString(), options);
  const payload = record(body);
  const location = record(payload['location']);
  const current = record(payload['current']);
  const condition = record(current['condition']);
  const timeZone = text(location['tz_id']);
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
  } catch {
    throw new ApiError('invalidResponse');
  }
  const observedAt = numeric(current['last_updated_epoch'], 1, 8640000000000) * 1000;
  return {
    ...(serverCachedAt === undefined ? {} : { serverCachedAt }),
    city:
      position.source === 'device' && position.city?.trim()
        ? position.city.trim()
        : text(location['name']),
    country: text(location['country']),
    region:
      position.source === 'device' && position.region?.trim()
        ? position.region.trim()
        : typeof location['region'] === 'string'
          ? location['region']
          : '',
    timeZone,
    observedAt,
    temperature: numeric(current['temp_c'], -150, 100),
    feelsLike: numeric(current['feelslike_c'], -200, 150),
    humidity: numeric(current['humidity'], 0, 100),
    windSpeed: numeric(current['wind_kph'], 0),
    windDirection: text(current['wind_dir']),
    uv: numeric(current['uv'], 0),
    pressure: numeric(current['pressure_mb'], 0),
    visibility: numeric(current['vis_km'], 0),
    conditionCode: numeric(condition['code'], 0),
    conditionText: text(condition['text']),
    conditionLocale: options.locale,
    isDay: numeric(current['is_day'], 0, 1) === 1,
  };
}
