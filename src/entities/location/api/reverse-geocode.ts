import { record, requestJson, type LocationQuery, type RequestOptions } from '@/shared/api';

/**
 * placeName
 * @param value A locality value from the geocoding provider.
 * @returns The usable place name when one is available.
 */
function placeName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * reverseGeocode
 * @param location The current coordinates obtained from this device.
 * @param options The cancellable client request dependencies.
 * @returns The same coordinates enriched with a local city and country.
 */
export async function reverseGeocode(
  location: Exclude<LocationQuery, { source: 'automatic' }>,
  options: RequestOptions,
): Promise<LocationQuery> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    localityLanguage: 'default',
  }).toString();
  const payload = record(await requestJson(url.toString(), { ...options, timeoutMs: 1800 }));
  const latitude = payload['latitude'];
  const longitude = payload['longitude'];
  if (
    payload['lookupSource'] !== 'coordinates' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Math.abs(latitude - location.latitude) > 0.5 ||
    Math.abs(longitude - location.longitude) > 0.5
  )
    return location;
  const countryCode = placeName(payload['countryCode']);
  const city = placeName(payload['city']) ?? placeName(payload['locality']);
  const region = placeName(payload['principalSubdivision']);
  return {
    ...location,
    countryCode,
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
  };
}
