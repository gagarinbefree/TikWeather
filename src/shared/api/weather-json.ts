import { weatherServerUrl } from '@/shared/config';
import { ApiError, type RequestOptions } from './types';
import { requestJson } from './request-json';

/**
 * weatherEndpoint. Build a provider compatible route on our backend
 *
 * @param path The fixed weather resource path.
 * @returns The HTTPS backend URL without provider credentials.
 */
export function weatherEndpoint(path: string): URL {
  return new URL(path, weatherServerUrl());
}

/**
 * serverSnapshotTime. Read a retained server timestamp from normalized weather
 *
 * @param value The weather or forecast result to inspect.
 * @returns Its retained server fetch time or null for live data.
 */
export function serverSnapshotTime(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !('serverCachedAt' in value)) return null;
  const time = value.serverCachedAt;
  return typeof time === 'number' && Number.isFinite(time) && time > 0 ? time : null;
}

/**
 * requestWeatherJson. Load native weather JSON and retain stale server metadata
 *
 * @param url The backend URL including native provider options.
 * @param options The cancellable transport dependencies.
 * @returns Native JSON and the original fetch time when the server used retained weather.
 */
export async function requestWeatherJson(
  url: string,
  options: RequestOptions,
): Promise<{ readonly payload: unknown; readonly serverCachedAt?: number }> {
  let serverCachedAt: number | undefined;
  const payload = await requestJson(url, {
    ...options,
    timeoutMs: options.timeoutMs ?? 40000,
    onResponse(response): void {
      options.onResponse?.(response);
      if (response.headers.get('X-Weather-Cache') !== 'stale') return;
      const value = response.headers.get('X-Weather-Fetched-At');
      const time = value ? Date.parse(value) : Number.NaN;
      if (!Number.isFinite(time) || time <= 0) throw new ApiError('invalidResponse');
      serverCachedAt = time;
    },
  });
  return { payload, ...(serverCachedAt === undefined ? {} : { serverCachedAt }) };
}
