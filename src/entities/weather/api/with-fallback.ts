import { ApiError } from '@/shared/api';

/**
 * ensureActive
 * @param signal The caller cancellation signal.
 */
function ensureActive(signal: AbortSignal): void {
  if (signal.aborted) throw new ApiError('cancelled');
}

/**
 * withFallback
 * @param sources The providers to try in preferred order.
 * @param signal The cancellation signal shared by all requests.
 * @returns The first successfully validated provider result.
 */
export async function withFallback<T>(
  sources: readonly (() => Promise<T>)[],
  signal: AbortSignal,
): Promise<T> {
  let primaryError: ApiError | null = null;
  for (const source of sources) {
    ensureActive(signal);
    try {
      return await source();
    } catch (error) {
      ensureActive(signal);
      if (error instanceof ApiError && error.kind === 'cancelled') throw new ApiError('cancelled');
      if (!(error instanceof ApiError)) throw error;
      primaryError ??= error;
    }
  }
  throw primaryError ?? new ApiError('configuration');
}
