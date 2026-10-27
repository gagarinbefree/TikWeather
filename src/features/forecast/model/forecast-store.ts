import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import {
  createForecastSlots,
  useWeatherGridStore,
  type ForecastDay,
  type ForecastHour,
} from '@/entities/weather';
import { ApiError, type FailureKind, type LocationQuery } from '@/shared/api';
import { mergeForecast } from './longest-forecast';
import type { ForecastServices } from './services';

interface ForecastContext {
  readonly location: LocationQuery;
  readonly locale: 'ru' | 'en';
  readonly timeZone: string;
  readonly now: number;
}

interface RequestAttempt {
  readonly depth: 1 | 3 | 16;
  readonly controller: AbortController;
}

const maximumDays = 16;

/**
 * useForecastStore
 * @returns Progressive daily and hourly forecasts with priority for the visible day.
 */
export const useForecastStore = defineStore('forecast', () => {
  const grid = useWeatherGridStore();
  const days = shallowRef<readonly ForecastDay[]>([]);
  const failure = shallowRef<FailureKind | null>(null);
  const loadingDepth = shallowRef<1 | 3 | 16 | null>(null);
  let session: ForecastContext | null = null;
  let services: ForecastServices | null = null;
  let attempt: RequestAttempt | null = null;
  let selectedDepth: 1 | 3 | 16 = 1;
  let failedDepth: 1 | 3 | 16 | null = null;
  let fulfilledDepth: 0 | 1 | 3 | 16 = 0;
  let loadedInterval: 2 | 3 = 2;
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
    fulfilledDepth = 0;
  }

  /**
   * restore
   * @param forecast The last normalized forecast saved in this browser.
   * @param now The current instant used for the restored grid.
   * @param timeZone The saved location time zone.
   */
  function restore(
    forecast: { readonly days: readonly ForecastDay[]; readonly intervalHours?: 2 | 3 },
    now: number,
    timeZone: string,
  ): void {
    cancel();
    days.value = forecast.days;
    failure.value = null;
    loadedInterval = forecast.intervalHours ?? 2;
    grid.update({
      now,
      timeZone,
      intervalHours: loadedInterval,
      days: forecast.days.map((day) => ({
        date: day.date,
        hours: day.hours.map((hour) => hour.timestamp),
        ...(day.intervalHours ? { intervalHours: day.intervalHours } : {}),
      })),
    });
  }

  /**
   * loadThrough
   * @param depth The smallest provider horizon containing the requested day.
   * @param force Whether an explicit retry may repeat a completed request.
   */
  function loadThrough(depth: 1 | 3 | 16, force = false): void {
    const context = session;
    const dependencies = services;
    if (
      !context ||
      !dependencies ||
      (!force &&
        (days.value.length >= depth || fulfilledDepth >= depth || failedDepth === depth)) ||
      (attempt && attempt.depth >= depth)
    )
      return;
    attempt?.controller.abort();
    const current: RequestAttempt = { depth, controller: new AbortController() };
    attempt = current;
    loadingDepth.value = depth;
    failure.value = null;
    failedDepth = null;
    const token = revision;
    void (async (): Promise<void> => {
      let nextDepth: 3 | 16 | null = null;
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
        if (forecast.days.length < Math.min(depth, 3)) throw new ApiError('invalidResponse');
        const expected = createForecastSlots(context.now, context.timeZone, maximumDays);
        for (let index = 0; index < Math.min(forecast.days.length, maximumDays); index++) {
          if (forecast.days[index]?.date !== expected[index]?.date)
            throw new ApiError('invalidResponse');
        }
        const combined =
          depth === maximumDays && days.value.length
            ? mergeForecast({ days: days.value, intervalHours: loadedInterval }, forecast)
            : forecast;
        days.value = combined.days.slice(0, maximumDays);
        loadedInterval = combined.intervalHours ?? 2;
        grid.update({
          now: context.now,
          timeZone: context.timeZone,
          intervalHours: loadedInterval,
          days: (depth === maximumDays ? expected.slice(0, days.value.length) : expected).map(
            (slot, index) => ({
              date: slot.date,
              hours: days.value[index]?.hours.map((hour) => hour.timestamp) ?? slot.hours,
              ...(days.value[index]?.intervalHours
                ? { intervalHours: days.value[index].intervalHours }
                : {}),
            }),
          ),
        });
        fulfilledDepth = depth;
        if (depth !== maximumDays && days.value.length < maximumDays)
          nextDepth = depth === 1 && days.value.length < 3 ? 3 : 16;
      } catch (error) {
        if (token !== revision || attempt !== current) return;
        failure.value = error instanceof ApiError ? error.kind : 'connection';
        failedDepth = depth;
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
    failedDepth = null;
    fulfilledDepth = 0;
    loadedInterval = 2;
    days.value = [];
    failure.value = null;
    grid.update({
      now: context.now,
      timeZone: context.timeZone,
      days: createForecastSlots(context.now, context.timeZone, maximumDays),
    });
    loadThrough(1);
  }

  /**
   * focus
   * @param row The visible row selected by a swipe or keyboard navigation.
   */
  function focus(row: number): void {
    if (!Number.isInteger(row) || row < 0 || row >= maximumDays) return;
    selectedDepth = row === 0 ? 1 : row < 3 ? 3 : 16;
    loadThrough(selectedDepth);
  }

  /**
   * retry
   */
  function retry(): void {
    const depth = failedDepth ?? (days.value.length < 3 ? 3 : 16);
    loadThrough(depth, true);
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

  return { days, failure, loadingDepth, start, restore, focus, retry, cancel, day, hour };
});
