import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import {
  createForecastSlots,
  useWeatherGridStore,
  type ForecastDay,
  type ForecastHour,
} from '@/entities/weather';
import { ApiError, type FailureKind, type LocationQuery } from '@/shared/api';
import type { ForecastServices } from './services';

interface ForecastContext {
  readonly location: LocationQuery;
  readonly locale: 'ru' | 'en';
  readonly timeZone: string;
  readonly now: number;
}

interface RequestAttempt {
  readonly depth: 1 | 2 | 3;
  readonly controller: AbortController;
}

/**
 * useForecastStore
 * @returns Progressive daily and hourly forecasts with priority for the visible day.
 */
export const useForecastStore = defineStore('forecast', () => {
  const grid = useWeatherGridStore();
  const days = shallowRef<readonly ForecastDay[]>([]);
  const failure = shallowRef<FailureKind | null>(null);
  const loadingDepth = shallowRef<1 | 2 | 3 | null>(null);
  let session: ForecastContext | null = null;
  let services: ForecastServices | null = null;
  let attempt: RequestAttempt | null = null;
  let selectedDepth: 1 | 2 | 3 = 1;
  let revision = 0;

  /**
   * cancel
   */
  function cancel(): void {
    revision++;
    attempt?.controller.abort();
    attempt = null;
    session = null;
    services = null;
    loadingDepth.value = null;
  }

  /**
   * loadThrough
   * @param depth The smallest provider horizon containing the requested day.
   */
  function loadThrough(depth: 1 | 2 | 3): void {
    const context = session;
    const dependencies = services;
    if (
      !context ||
      !dependencies ||
      days.value.length >= depth ||
      (attempt && attempt.depth >= depth)
    )
      return;
    attempt?.controller.abort();
    const current: RequestAttempt = { depth, controller: new AbortController() };
    attempt = current;
    loadingDepth.value = depth;
    failure.value = null;
    const token = revision;
    void (async (): Promise<void> => {
      let nextDepth: 2 | 3 | null = null;
      try {
        const forecast = await dependencies.forecast(
          context.location,
          context.locale,
          context.timeZone,
          depth,
          context.now,
          current.controller.signal,
        );
        if (token !== revision || attempt !== current) return;
        if (forecast.days.length < depth) throw new ApiError('invalidResponse');
        const expected = createForecastSlots(context.now, context.timeZone, 3);
        for (let index = 0; index < Math.min(forecast.days.length, 3); index++) {
          if (forecast.days[index]?.date !== expected[index]?.date)
            throw new ApiError('invalidResponse');
        }
        days.value = forecast.days.slice(0, 3);
        grid.update({
          now: context.now,
          timeZone: context.timeZone,
          intervalHours: forecast.intervalHours ?? 2,
          days: expected.map((slot, index) => ({
            date: slot.date,
            hours: days.value[index]?.hours.map((hour) => hour.timestamp) ?? slot.hours,
          })),
        });
        if (days.value.length < 3) nextDepth = (depth + 1) as 2 | 3;
      } catch (error) {
        if (token !== revision || attempt !== current) return;
        failure.value = error instanceof ApiError ? error.kind : 'connection';
      } finally {
        if (token === revision && attempt === current) {
          attempt = null;
          loadingDepth.value = null;
          if (nextDepth) loadThrough(nextDepth);
        }
      }
    })();
  }

  /**
   * start
   * @param context The location, language and fixed current weather instant.
   * @param dependencies The cancellable provider request.
   */
  function start(context: ForecastContext, dependencies: ForecastServices): void {
    cancel();
    session = context;
    services = dependencies;
    selectedDepth = 1;
    days.value = [];
    failure.value = null;
    grid.update({
      now: context.now,
      timeZone: context.timeZone,
      days: createForecastSlots(context.now, context.timeZone, 3),
    });
    loadThrough(1);
  }

  /**
   * focus
   * @param row The visible row selected by a swipe or keyboard navigation.
   */
  function focus(row: number): void {
    if (!Number.isInteger(row) || row < 0 || row > 2) return;
    selectedDepth = (row + 1) as 1 | 2 | 3;
    loadThrough(selectedDepth);
  }

  /**
   * retry
   */
  function retry(): void {
    const depth = Math.max(selectedDepth, Math.min(days.value.length + 1, 3)) as 1 | 2 | 3;
    loadThrough(depth);
  }

  /**
   * day
   * @param date The local calendar date of the visible row.
   * @returns The available daily forecast if its request has finished.
   */
  function day(date: string): ForecastDay | undefined {
    return days.value.find((item) => item.date === date);
  }

  /**
   * hour
   * @param date The local calendar date of the visible row.
   * @param timestamp The hourly forecast instant in milliseconds.
   * @returns The matching hourly forecast if it has loaded.
   */
  function hour(date: string, timestamp: number): ForecastHour | undefined {
    return day(date)?.hours.find((item) => item.timestamp === timestamp);
  }

  return { days, failure, loadingDepth, start, focus, retry, cancel, day, hour };
});
