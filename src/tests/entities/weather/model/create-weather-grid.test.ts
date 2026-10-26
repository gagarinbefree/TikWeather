import { describe, expect, it } from 'vitest';
import { createWeatherGrid } from '@/entities/weather';

/**
 * timestamp
 * @param iso The timestamp with an explicit UTC offset.
 * @returns The timestamp in milliseconds.
 */
function timestamp(iso: string): number {
  return Date.parse(iso);
}

const now = timestamp('2026-10-26T10:30:00Z');

describe('createWeatherGrid', () => {
  it('starts with current weather before any forecast has arrived', () => {
    expect(createWeatherGrid({ now, timeZone: 'UTC', days: [] })).toEqual([
      [{ id: '2026-10-26/current', kind: 'current', date: '2026-10-26', timestamp: now }],
    ]);
  });

  it('puts the current cell first and selects forecast hours two hours apart', () => {
    const hours = [11, 12, 13, 14, 15, 16].map((hour) =>
      timestamp(`2026-10-26T${String(hour)}:00:00Z`),
    );
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [{ date: '2026-10-26', hours }],
    });

    expect(grid[0]?.map((cell) => cell.kind)).toEqual(['current', 'hourly', 'hourly', 'hourly']);
    expect(grid[0]?.slice(1).map((cell) => cell.timestamp)).toEqual([
      timestamp('2026-10-26T12:00:00Z'),
      timestamp('2026-10-26T14:00:00Z'),
      timestamp('2026-10-26T16:00:00Z'),
    ]);
  });

  it('starts future rows with daily summaries and uses midnight as their time origin', () => {
    const hours = [0, 1, 2, 3, 4, 6].map((hour) =>
      timestamp(`2026-10-27T${String(hour).padStart(2, '0')}:00:00Z`),
    );
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [{ date: '2026-10-27', hours }],
    });

    expect(grid[1]?.[0]).toEqual({ id: '2026-10-27/daily', kind: 'daily', date: '2026-10-27' });
    expect(grid[1]?.slice(1).map((cell) => cell.timestamp)).toEqual([
      timestamp('2026-10-27T02:00:00Z'),
      timestamp('2026-10-27T04:00:00Z'),
      timestamp('2026-10-27T06:00:00Z'),
    ]);
  });

  it('keeps days without hourly data as rows containing only the daily summary', () => {
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [{ date: '2026-10-27', hours: [] }],
    });

    expect(grid.map((row) => row.length)).toEqual([1, 1]);
  });

  it('uses the location date when UTC is still on the previous day', () => {
    const localNow = timestamp('2026-10-26T23:30:00Z');
    const grid = createWeatherGrid({
      now: localNow,
      timeZone: 'Asia/Yekaterinburg',
      days: [
        {
          date: '2026-10-27',
          hours: [timestamp('2026-10-27T01:00:00Z'), timestamp('2026-10-27T03:00:00Z')],
        },
      ],
    });

    expect(grid).toHaveLength(1);
    expect(grid[0]?.[0]?.date).toBe('2026-10-27');
    expect(grid[0]?.slice(1).map((cell) => cell.timestamp)).toEqual([
      timestamp('2026-10-27T01:00:00Z'),
      timestamp('2026-10-27T03:00:00Z'),
    ]);
  });

  it('sorts days and hours chronologically and omits expired days', () => {
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [
        { date: '2026-10-28', hours: [] },
        { date: '2026-10-25', hours: [] },
        {
          date: '2026-10-27',
          hours: [timestamp('2026-10-27T04:00:00Z'), timestamp('2026-10-27T02:00:00Z')],
        },
      ],
    });

    expect(grid.map((row) => row[0]?.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28']);
    expect(grid[1]?.slice(1).map((cell) => cell.timestamp)).toEqual([
      timestamp('2026-10-27T02:00:00Z'),
      timestamp('2026-10-27T04:00:00Z'),
    ]);
  });

  it('does not create unavailable forecast hours or fill missing calendar days', () => {
    const hour = timestamp('2026-10-29T06:00:00Z');
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [{ date: '2026-10-29', hours: [hour] }],
    });

    expect(grid.map((row) => row[0]?.date)).toEqual(['2026-10-26', '2026-10-29']);
    expect(grid[1]).toHaveLength(2);
    expect(grid[1]?.[1]?.timestamp).toBe(hour);
  });

  it('supports the complete sixteen day provider horizon', () => {
    const days = Array.from({ length: 16 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10),
      hours: [],
    }));
    const grid = createWeatherGrid({ now, timeZone: 'UTC', days });

    expect(grid).toHaveLength(16);
    expect(grid.at(-1)?.[0]?.date).toBe('2026-11-10');
    expect(grid.every((row) => row.length > 0)).toBe(true);
  });

  it('keeps the next calendar year in the next row after local midnight', () => {
    const grid = createWeatherGrid({
      now: timestamp('2026-12-31T18:30:00Z'),
      timeZone: 'Asia/Yekaterinburg',
      days: [
        { date: '2026-12-31', hours: [] },
        { date: '2027-01-01', hours: [timestamp('2026-12-31T21:00:00Z')] },
      ],
    });

    expect(grid.map((row) => row[0]?.date)).toEqual(['2026-12-31', '2027-01-01']);
    expect(grid.map((row) => row.length)).toEqual([1, 2]);
  });

  it('uses a three hour step when the provider only supplies three hour forecasts', () => {
    const hours = [0, 3, 6, 9].map((hour) =>
      timestamp(`2026-10-27T${String(hour).padStart(2, '0')}:00:00Z`),
    );
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      intervalHours: 3,
      days: [{ date: '2026-10-27', hours }],
    });

    expect(grid[1]?.slice(1).map((cell) => cell.timestamp)).toEqual(hours.slice(1));
  });

  it('keeps the next available three hour forecast in the current day', () => {
    const current = timestamp('2026-10-26T20:30:00Z');
    const next = timestamp('2026-10-26T21:00:00Z');
    const grid = createWeatherGrid({
      now: current,
      timeZone: 'UTC',
      intervalHours: 3,
      days: [{ date: '2026-10-26', hours: [next] }],
    });

    expect(grid[0]?.[1]?.timestamp).toBe(next);
  });

  it('skips a nonexistent local hour during the spring daylight saving change', () => {
    const grid = createWeatherGrid({
      now: timestamp('2026-03-28T12:00:00Z'),
      timeZone: 'Europe/Berlin',
      days: [
        {
          date: '2026-03-29',
          hours: [timestamp('2026-03-29T01:00:00Z'), timestamp('2026-03-29T02:00:00Z')],
        },
      ],
    });

    expect(grid[1]?.slice(1).map((cell) => cell.timestamp)).toEqual([
      timestamp('2026-03-29T02:00:00Z'),
    ]);
  });

  it('keeps repeated local hours distinct during the autumn daylight saving change', () => {
    const first = timestamp('2026-10-25T00:00:00Z');
    const second = timestamp('2026-10-25T01:00:00Z');
    const grid = createWeatherGrid({
      now: timestamp('2026-10-24T12:00:00Z'),
      timeZone: 'Europe/Berlin',
      days: [{ date: '2026-10-25', hours: [first, second] }],
    });

    expect(grid[1]?.slice(1).map((cell) => cell.timestamp)).toEqual([first, second]);
    expect(new Set(grid[1]?.map((cell) => cell.id)).size).toBe(3);
  });

  it('keeps existing identifiers stable as later days arrive', () => {
    const initial = createWeatherGrid({ now, timeZone: 'UTC', days: [] });
    const extended = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [{ date: '2026-10-27', hours: [] }],
    });

    expect(extended[0]).toEqual(initial[0]);
  });

  it('does not modify provider arrays while sorting', () => {
    const hours = Object.freeze([
      timestamp('2026-10-27T04:00:00Z'),
      timestamp('2026-10-27T02:00:00Z'),
    ]);
    const days = Object.freeze([{ date: '2026-10-27', hours }]);

    expect(() => createWeatherGrid({ now, timeZone: 'UTC', days })).not.toThrow();
    expect(hours[0]).toBe(timestamp('2026-10-27T04:00:00Z'));
  });

  it.each(['2026-02-30', '2026-13-01', '26-10-2026', '2026-1-2'])(
    'rejects invalid date %s',
    (date) => {
      expect(() =>
        createWeatherGrid({ now, timeZone: 'UTC', days: [{ date, hours: [] }] }),
      ).toThrow(RangeError);
    },
  );

  it('rejects an hour assigned to a different local day', () => {
    expect(() =>
      createWeatherGrid({
        now,
        timeZone: 'Asia/Yekaterinburg',
        days: [{ date: '2026-10-27', hours: [timestamp('2026-10-27T23:00:00Z')] }],
      }),
    ).toThrow(RangeError);
  });

  it('rejects duplicate calendar days', () => {
    expect(() =>
      createWeatherGrid({
        now,
        timeZone: 'UTC',
        days: [
          { date: '2026-10-27', hours: [] },
          { date: '2026-10-27', hours: [] },
        ],
      }),
    ).toThrow(RangeError);
  });

  it('deduplicates hourly timestamps in a provider response', () => {
    const hour = timestamp('2026-10-27T02:00:00Z');
    const grid = createWeatherGrid({
      now,
      timeZone: 'UTC',
      days: [{ date: '2026-10-27', hours: [hour, hour] }],
    });

    expect(grid[1]).toHaveLength(2);
  });

  it.each([NaN, Infinity, -Infinity, 9e15])('rejects an invalid clock %s', (invalidNow) => {
    expect(() => createWeatherGrid({ now: invalidNow, timeZone: 'UTC', days: [] })).toThrow(
      RangeError,
    );
  });

  it('rejects invalid hourly timestamps', () => {
    expect(() =>
      createWeatherGrid({
        now,
        timeZone: 'UTC',
        days: [{ date: '2026-10-27', hours: [NaN] }],
      }),
    ).toThrow(RangeError);
  });

  it('rejects an invalid time zone', () => {
    expect(() => createWeatherGrid({ now, timeZone: 'Unknown/Place', days: [] })).toThrow(
      RangeError,
    );
  });
});
