import {
  ApiError,
  numeric,
  record,
  requestJson,
  validCoordinates,
  type LocationQuery,
  type RequestOptions,
} from '@/shared/api';
import type { DeviceGeolocation } from '@/entities/location/model/types';
import { reverseGeocode } from './reverse-geocode';

interface LocateOptions extends RequestOptions {
  readonly device?: DeviceGeolocation | null;
  readonly deviceTimeoutMs?: number;
}

/**
 * devicePosition
 * @param device The available secure browser geolocation API.
 * @param options The cancellation and permission prompt budget.
 * @returns Device coordinates or null when location is unavailable.
 */
function devicePosition(
  device: DeviceGeolocation | null,
  options: LocateOptions,
): Promise<LocationQuery | null> {
  if (options.signal?.aborted) return Promise.reject(new ApiError('cancelled'));
  if (!device) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let finished = false;
    const timeoutMs = options.deviceTimeoutMs ?? 8000;
    const timer = setTimeout(() => {
      finish(null);
    }, timeoutMs);
    /**
     * finish
     * @param result The valid device coordinates or unavailable result.
     */
    function finish(result: LocationQuery | null): void {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      resolve(result);
    }
    /**
     * cancel
     */
    function cancel(): void {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      reject(new ApiError('cancelled'));
    }
    options.signal?.addEventListener('abort', cancel, { once: true });
    try {
      device.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          finish(
            validCoordinates(latitude, longitude)
              ? { source: 'device', latitude, longitude, countryCode: null }
              : null,
          );
        },
        () => {
          finish(null);
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
      );
    } catch {
      finish(null);
    }
  });
}

/**
 * coordinate
 * @param value The numeric or textual coordinate returned by GeoJS.
 * @param bound The maximum absolute geographic value.
 * @returns A validated finite coordinate.
 */
function coordinate(value: unknown, bound: number): number {
  return numeric(typeof value === 'string' && value.trim() ? Number(value) : value, -bound, bound);
}

/**
 * locate
 * @param options The optional browser API and network dependencies.
 * @returns The device location with IP detection as a bounded fallback.
 */
export async function locate(options: LocateOptions = {}): Promise<LocationQuery> {
  const device =
    options.device === undefined
      ? globalThis.isSecureContext && typeof navigator !== 'undefined'
        ? navigator.geolocation
        : null
      : options.device;
  const found = await devicePosition(device ?? null, options);
  if (options.signal?.aborted) throw new ApiError('cancelled');
  if (found && found.source === 'device') {
    try {
      return await reverseGeocode(found, options);
    } catch (error) {
      if (options.signal?.aborted || (error instanceof ApiError && error.kind === 'cancelled'))
        throw new ApiError('cancelled');
      return found;
    }
  }
  try {
    const payload = record(
      await requestJson('https://get.geojs.io/v1/ip/geo.json', {
        ...options,
        timeoutMs: options.timeoutMs ?? 6000,
      }),
    );
    return {
      source: 'ip',
      latitude: coordinate(payload['latitude'], 90),
      longitude: coordinate(payload['longitude'], 180),
      countryCode: typeof payload['country_code'] === 'string' ? payload['country_code'] : null,
      ...(typeof payload['city'] === 'string' && payload['city'].trim()
        ? { city: payload['city'].trim() }
        : {}),
      ...(typeof payload['region'] === 'string' && payload['region'].trim()
        ? { region: payload['region'].trim() }
        : {}),
    };
  } catch (error) {
    if (options.signal?.aborted || (error instanceof ApiError && error.kind === 'cancelled'))
      throw new ApiError('cancelled');
    return { source: 'automatic' };
  }
}
