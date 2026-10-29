import type { Forecast, ForecastDay } from '@/entities/weather';
import { ApiError, serverSnapshotTime } from '@/shared/api';

/**
 * throwIfCancelled. Stop when the request has been cancelled
 *
 * @param signal The location session cancellation signal.
 */
function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new ApiError('cancelled');
}

/**
 * mergeForecast. Combine forecast days while keeping the most detailed readings
 *
 * @param first An already loaded provider forecast.
 * @param second A newer provider forecast that may reach more days.
 * @returns Unique calendar days with the richest available hourly readings.
 */
export function mergeForecast(first: Forecast, second: Forecast): Forecast {
  const firstDays = new Map(first.days.map((day) => [day.date, day]));
  const secondDays = new Map(second.days.map((day) => [day.date, day]));
  const dates = [...new Set([...firstDays.keys(), ...secondDays.keys()])].sort();
  const days = dates.map((date): ForecastDay => {
    const earlier = firstDays.get(date);
    const later = secondDays.get(date);
    const earlierTime = serverSnapshotTime(earlier);
    const laterTime = serverSnapshotTime(later);
    const keepEarlier =
      earlier &&
      (!later ||
        (earlierTime === null && laterTime !== null) ||
        (earlierTime !== null && laterTime !== null && earlierTime > laterTime) ||
        (earlierTime === laterTime && earlier.hours.length >= later.hours.length));
    const selected = keepEarlier ? earlier : later;
    const source = keepEarlier ? first : second;
    if (!selected) throw new ApiError('invalidResponse');
    const retainedAt = serverSnapshotTime(selected);
    return {
      ...selected,
      intervalHours: selected.intervalHours ?? source.intervalHours ?? 2,
      ...(retainedAt === null ? {} : { serverCachedAt: retainedAt }),
    };
  });
  const times = days.map(serverSnapshotTime).filter((value): value is number => value !== null);
  return {
    days,
    intervalHours:
      first.days.length >= second.days.length
        ? (first.intervalHours ?? 2)
        : (second.intervalHours ?? 2),
    ...(times.length ? { serverCachedAt: Math.min(...times) } : {}),
  };
}

/**
 * longestForecast. Try providers to extend the forecast without losing loaded data
 *
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
      if (best.days.length >= maximum && serverSnapshotTime(best) === null) return best;
    } catch (error) {
      throwIfCancelled(signal);
      if (error instanceof ApiError && error.kind === 'cancelled') throw error;
      if (!(error instanceof ApiError)) throw error;
      firstError ??= error;
      if (error.sharedLimit) {
        firstError = error;
        break;
      }
    }
  }
  if (best) return best;
  throw firstError ?? new ApiError('configuration');
}
