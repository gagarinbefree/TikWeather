import {
  ApiError,
  record,
  requestJson,
  weatherEndpoint,
  type LocationQuery,
  type RequestOptions,
} from '@/shared/api';
import { localeForCountry } from '@/shared/locales';
import {
  isResolvedLocation,
  type ResolvedLocation,
} from '@/entities/location/model/resolved-location';

/**
 * placeName. Read a small nonempty place label from a server response
 *
 * @param value The untrusted location label.
 * @returns The usable label or no label.
 */
function placeName(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200
    ? value.trim()
    : null;
}

/**
 * serverReverseGeocode. Resolve a GPS point using one independent reserve method on our server
 *
 * @param provider The fixed server reserve method.
 * @param location The original device or IP coordinates.
 * @param options The cancellable transport dependencies.
 * @returns The original position with a named city and ISO country.
 */
export async function serverReverseGeocode(
  provider: 'openweathermap' | 'weatherapi',
  location: Exclude<LocationQuery, { source: 'automatic' }>,
  options: RequestOptions,
): Promise<ResolvedLocation> {
  const url = weatherEndpoint(`api/location/${provider}/reverse`);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
  }).toString();
  const payload = record(
    await requestJson(url.toString(), { ...options, timeoutMs: options.timeoutMs ?? 8000 }),
  );
  if (
    typeof payload['latitude'] !== 'number' ||
    typeof payload['longitude'] !== 'number' ||
    !Number.isFinite(payload['latitude']) ||
    !Number.isFinite(payload['longitude']) ||
    Math.abs(payload['latitude'] - location.latitude) > 0.0001 ||
    Math.abs(payload['longitude'] - location.longitude) > 0.0001
  )
    throw new ApiError('location');
  const countryCode = placeName(payload['countryCode']);
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) throw new ApiError('location');
  const names = record(payload['names']);
  const city = placeName(names[localeForCountry(countryCode)]) ?? placeName(payload['city']);
  const region = placeName(payload['region']);
  const result = {
    ...location,
    countryCode,
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
  };
  if (!isResolvedLocation(result)) throw new ApiError('location');
  return result;
}
