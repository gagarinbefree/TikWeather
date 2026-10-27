import { ApiError } from './types';

/**
 * record. Read a response object and reject invalid values
 *
 * @param value The untrusted response fragment.
 * @returns A plain record with unknown values.
 */
export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ApiError('invalidResponse');
  return value as Record<string, unknown>;
}

/**
 * numeric. Read a finite number within the allowed range
 *
 * @param value The untrusted measurement.
 * @param minimum The inclusive lower bound.
 * @param maximum The inclusive upper bound.
 * @returns A finite measurement within its physical range.
 */
export function numeric(value: unknown, minimum = -Infinity, maximum = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum)
    throw new ApiError('invalidResponse');
  return value;
}

/**
 * text. Read a nonempty trimmed string
 *
 * @param value The untrusted text fragment.
 * @returns A nonempty trimmed string.
 */
export function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError('invalidResponse');
  return value.trim();
}

/**
 * validCoordinates. Check latitude and longitude bounds
 *
 * @param latitude The latitude supplied by a location provider.
 * @param longitude The longitude supplied by a location provider.
 * @returns Whether both coordinates are finite and within geographic bounds.
 */
export function validCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
  );
}
