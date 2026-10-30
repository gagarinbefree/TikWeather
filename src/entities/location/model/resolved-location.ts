import { validCoordinates, type LocationQuery } from '@/shared/api';

export type ResolvedLocation = Exclude<LocationQuery, { source: 'automatic' }> & {
  readonly city: string;
  readonly countryCode: string;
};

/**
 * isResolvedLocation. Check that coordinates city and country are available
 *
 * @param location The detected location to inspect.
 * @returns Whether the location can be used to display named local weather.
 */
export function isResolvedLocation(location: LocationQuery): location is ResolvedLocation {
  return (
    location.source !== 'automatic' &&
    validCoordinates(location.latitude, location.longitude) &&
    typeof location.city === 'string' &&
    location.city.trim().length > 0 &&
    typeof location.countryCode === 'string' &&
    /^[a-z]{2}$/i.test(location.countryCode)
  );
}
