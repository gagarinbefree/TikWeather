import {
  ApiError,
  record,
  requestJson,
  type LocationQuery,
  type RequestOptions,
} from '@/shared/api';

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
 * reverseGeocode. Find the local city and country for device coordinates
 *
 * @param location The current coordinates obtained from this device.
 * @param options The cancellable client request dependencies.
 * @returns The same coordinates enriched with a local city and country.
 */
export async function reverseGeocode(
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
