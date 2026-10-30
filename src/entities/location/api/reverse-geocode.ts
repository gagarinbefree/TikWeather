import {
  ApiError,
  record,
  requestJson,
  type LocationQuery,
  type RequestOptions,
} from '@/shared/api';
import { serverReverseGeocode } from './server-reverse-geocode';

import {
  isResolvedLocation,
  type ResolvedLocation,
} from '@/entities/location/model/resolved-location';

/**
 * placeName. Read a place name and ignore empty values
 *
 * @param value A locality value from the geocoding provider.
 * @returns The usable place name when one is available.
 */
function placeName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * cloudReverseGeocode. Find the local city and country through BigDataCloud
 *
 * @param location The current coordinates obtained from this device.
 * @param options The cancellable client request dependencies.
 * @returns The same coordinates enriched with a local city and country.
 */
async function cloudReverseGeocode(
  location: Exclude<LocationQuery, { source: 'automatic' }>,
  options: RequestOptions,
): Promise<ResolvedLocation> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    localityLanguage: 'default',
  }).toString();
  const payload = record(
    await requestJson(url.toString(), { ...options, timeoutMs: options.timeoutMs ?? 8000 }),
  );
  const latitude = payload['latitude'];
  const longitude = payload['longitude'];
  if (
    payload['lookupSource'] !== 'coordinates' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Math.abs(latitude - location.latitude) > 0.5 ||
    Math.abs(longitude - location.longitude) > 0.5
  )
    throw new ApiError('location');
  const countryCode = placeName(payload['countryCode']);
  const city = placeName(payload['city']) ?? placeName(payload['locality']);
  const region = placeName(payload['principalSubdivision']);
  const resolved = {
    ...location,
    countryCode,
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
  };
  if (!isResolvedLocation(resolved)) throw new ApiError('location');
  return resolved;
}

/**
 * reverseGeocode. Resolve a GPS point through BigDataCloud and then two independent server reserves
 *
 * @param location The original GPS position that must remain unchanged.
 * @param options The cancellable transport dependencies.
 * @returns The city and country from the first usable source.
 */
export async function reverseGeocode(
  location: Exclude<LocationQuery, { source: 'automatic' }>,
  options: RequestOptions,
): Promise<ResolvedLocation> {
  const attempts = [
    (): Promise<ResolvedLocation> => cloudReverseGeocode(location, options),
    (): Promise<ResolvedLocation> => serverReverseGeocode('openweathermap', location, options),
    (): Promise<ResolvedLocation> => serverReverseGeocode('weatherapi', location, options),
  ];
  for (const [index, attempt] of attempts.entries()) {
    try {
      return await attempt();
    } catch (error) {
      if (options.signal?.aborted || (error instanceof ApiError && error.kind === 'cancelled'))
        throw new ApiError('cancelled');
      if (index > 0 && error instanceof ApiError && error.sharedLimit) throw error;
    }
  }
  throw new ApiError('location');
}
