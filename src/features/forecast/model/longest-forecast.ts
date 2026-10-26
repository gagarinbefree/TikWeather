import type { Forecast } from '@/entities/weather';
import { ApiError } from '@/shared/api';

/**
 * throwIfCancelled
 * @param signal The location session cancellation signal.
 */
function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new ApiError('cancelled');
}

/**
 * longestForecast
 * @param sources The forecast providers in preferred order.
 * @param signal The cancellation signal for the location session.
 * @param maximum The largest supported number of calendar days.
 * @returns The longest validated forecast returned by an available provider.
 */
export async function longestForecast(
  sources: readonly (() => Promise<Forecast>)[],
  signal: AbortSignal,
  maximum: number,
): Promise<Forecast> {
  let best: Forecast | null = null;
  let firstError: ApiError | null = null;
  for (const source of sources) {
    throwIfCancelled(signal);
    try {
      const forecast = await source();
      throwIfCancelled(signal);
      if (forecast.days.length > (best?.days.length ?? 0)) best = forecast;
      if (forecast.days.length >= maximum) return forecast;
    } catch (error) {
      throwIfCancelled(signal);
      if (error instanceof ApiError && error.kind === 'cancelled') throw error;
      if (!(error instanceof ApiError)) throw error;
      firstError ??= error;
    }
  }
  if (best) return best;
  throw firstError ?? new ApiError('configuration');
}
