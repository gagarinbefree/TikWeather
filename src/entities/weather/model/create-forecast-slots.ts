import { messages } from '@/shared/locales';
import type { ForecastDaySlots } from './types';

/**
 * createForecastSlots
 * @param now The instant at which current weather became available.
 * @param timeZone The IANA time zone of the weather location.
 * @param count The number of provider days that can be requested.
 * @returns Calendar rows of actual hourly instants that can host loading cells.
 */
export function createForecastSlots(
  now: number,
  timeZone: string,
  count: 1 | 2 | 3,
): readonly ForecastDaySlots[] {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const days = new Map<string, number[]>();
  const localMinute = formatter.formatToParts(now).find((part) => part.type === 'minute')?.value;
  if (localMinute === undefined) throw new RangeError(messages.en.missingDatePart);
  const firstHour = now - Number(localMinute) * 60_000 - (now % 60_000);
  for (let offset = 0; offset < 120; offset++) {
    const timestamp = firstHour + offset * 3_600_000;
    const parts = formatter.formatToParts(timestamp);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) throw new RangeError(messages.en.missingDatePart);
    const date = `${year}-${month}-${day}`;
    if (!days.has(date)) {
      if (days.size === count) break;
      days.set(date, []);
    }
    days.get(date)?.push(timestamp);
  }
  if (days.size !== count) throw new RangeError(messages.en.incompleteForecastCalendar);
  return [...days].map(([date, hours]) => ({ date, hours }));
}
