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
 * mergeForecast
 * @param first An already loaded provider forecast.
 * @param second A newer provider forecast that may reach more days.
 * @returns Unique calendar days with the richest available hourly readings.
 */
export function mergeForecast(first: Forecast, second: Forecast): Forecast {
  const firstDays = new Map(first.days.map((day) => [day.date, day]));
  const secondDays = new Map(second.days.map((day) => [day.date, day]));
  const dates = [...new Set([...firstDays.keys(), ...secondDays.keys()])].sort();
  return {
    days: dates.map((date) => {
      const earlier = firstDays.get(date);
      const later = secondDays.get(date);
      if (earlier && (!later || earlier.hours.length >= later.hours.length))
        return { ...earlier, intervalHours: earlier.intervalHours ?? first.intervalHours ?? 2 };
      if (!later) throw new ApiError('invalidResponse');
      return { ...later, intervalHours: later.intervalHours ?? second.intervalHours ?? 2 };
    }),
    intervalHours:
      first.days.length >= second.days.length
        ? (first.intervalHours ?? 2)
        : (second.intervalHours ?? 2),
  };
}

/**
 * longestForecast
 * @param sources The forecast providers in preferred order.
 * @param signal The cancellation signal for the location session.
 * @param maximum The largest supported number of calendar days.
 * @returns The available calendar days with the richest readings for shared dates.
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
      best = best ? mergeForecast(best, forecast) : forecast;
      if (best.days.length >= maximum) return best;
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
