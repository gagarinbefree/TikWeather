import { messages } from '@/shared/locales';
import type { WeatherCell, WeatherGrid, WeatherGridOptions } from './types';

interface LocalTime {
  readonly date: string;
  readonly hour: number;
}

/**
 * validateInterval
 * @param interval The requested number of hours between forecast slots.
 */
function validateInterval(interval: number): void {
  if (interval !== 2 && interval !== 3) throw new RangeError(messages.en.invalidInterval);
}

/**
 * validateTimestamp
 * @param timestamp The instant in milliseconds since the Unix epoch.
 */
function validateTimestamp(timestamp: number): void {
  if (!Number.isFinite(timestamp) || Number.isNaN(new Date(timestamp).getTime())) {
    throw new RangeError(messages.en.invalidTimestamp);
  }
}

/**
 * validateDate
 * @param date The calendar date in the YYYY MM DD numeric format.
 */
function validateDate(date: string): void {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(messages.en.invalidDate);
  }
}

/**
 * readDatePart
 * @param parts The parts returned by the location time formatter.
 * @param type The required date part.
 * @returns The formatted date part.
 */
function readDatePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined) throw new RangeError(messages.en.missingDatePart);
  return value;
}

/**
 * localTime
 * @param formatter The formatter using the location time zone.
 * @param timestamp The instant in milliseconds since the Unix epoch.
 * @returns The local calendar date and hour.
 */
function localTime(formatter: Intl.DateTimeFormat, timestamp: number): LocalTime {
  validateTimestamp(timestamp);
  const parts = formatter.formatToParts(timestamp);
  return {
    date: `${readDatePart(parts, 'year')}-${readDatePart(parts, 'month')}-${readDatePart(parts, 'day')}`,
    hour: Number(readDatePart(parts, 'hour')),
  };
}

/**
 * createWeatherGrid
 *
 * Build stable cell descriptors from real provider timestamps.
 * The current day starts at the opening hour and future days start at midnight.
 * @param options The fixed clock and location time zone with available forecast days.
 * @returns The immutable grid with a current cell and available daily and hourly cells.
 */
export function createWeatherGrid(options: WeatherGridOptions): WeatherGrid {
  const interval = options.intervalHours ?? 2;
  validateInterval(interval);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const current = localTime(formatter, options.now);
  const days = new Map<string, readonly number[]>();

  for (const day of options.days) {
    validateDate(day.date);
    if (days.has(day.date)) throw new RangeError(messages.en.duplicateDate);
    for (const timestamp of day.hours) {
      if (localTime(formatter, timestamp).date !== day.date) {
        throw new RangeError(messages.en.wrongDay);
      }
    }
    days.set(day.date, day.hours);
  }
  if (!days.has(current.date)) days.set(current.date, []);

  const rows: (readonly WeatherCell[])[] = [];
  for (const [date, hours] of [...days].sort(([first], [second]) => first.localeCompare(second))) {
    if (date < current.date) continue;
    const isToday = date === current.date;
    const firstCell: WeatherCell = isToday
      ? { id: `${date}/current`, kind: 'current', date, timestamp: options.now }
      : { id: `${date}/daily`, kind: 'daily', date };
    const row: WeatherCell[] = [Object.freeze(firstCell)];
    const originHour = isToday ? current.hour : 0;

    for (const timestamp of [...new Set(hours)].sort((first, second) => first - second)) {
      const { hour } = localTime(formatter, timestamp);
      if (isToday && interval === 3 ? timestamp <= options.now : hour < originHour + interval)
        continue;
      if (interval === 2 && (hour - originHour) % interval !== 0) continue;
      row.push(
        Object.freeze({ id: `${date}/hour/${String(timestamp)}`, kind: 'hourly', date, timestamp }),
      );
    }
    rows.push(Object.freeze(row));
  }
  return Object.freeze(rows);
}
