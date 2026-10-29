import { ApiError, serverSnapshotTime } from '@/shared/api';

/**
 * ensureActive. Stop when the request has been cancelled
 *
 * @param signal The caller cancellation signal.
 */
function ensureActive(signal: AbortSignal): void {
  if (signal.aborted) throw new ApiError('cancelled');
}

/**
 * withFallback. Try weather providers in order until one succeeds
 *
 * @param sources The providers to try in preferred order.
 * @param signal The cancellation signal shared by all requests.
 * @returns The first successfully validated provider result.
 */
export async function withFallback<T>(
  sources: readonly (() => Promise<T>)[],
  signal: AbortSignal,
): Promise<T> {
  let retained: { readonly value: T; readonly time: number } | null = null;
  let primaryError: ApiError | null = null;
  for (const source of sources) {
    ensureActive(signal);
    try {
      const value = await source();
      ensureActive(signal);
      const time = serverSnapshotTime(value);
      if (time === null) return value;
      if (retained === null || time > retained.time) retained = { value, time };
    } catch (error) {
      ensureActive(signal);
      if (error instanceof ApiError && error.kind === 'cancelled') throw new ApiError('cancelled');
      if (!(error instanceof ApiError)) throw error;
      primaryError ??= error;
      if (error.sharedLimit) {
        primaryError = error;
        break;
      }
    }
  }
  if (retained) return retained.value;
  throw primaryError ?? new ApiError('configuration');
}
