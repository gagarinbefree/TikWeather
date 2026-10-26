import { describe, expect, it } from 'vitest';
import { createForecastSlots, createWeatherGrid } from '@/entities/weather';

describe('createForecastSlots', () => {
  it('makes three swipeable days and two hour slots in the location timezone', () => {
    const now = Date.UTC(2026, 9, 26, 5, 37);
    const days = createForecastSlots(now, 'Asia/Yekaterinburg', 3);
    const grid = createWeatherGrid({ now, timeZone: 'Asia/Yekaterinburg', days });
    expect(days.map((day) => day.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28']);
    expect(grid).toHaveLength(3);
    expect(grid[0]?.[0]?.kind).toBe('current');
    expect(grid[0]?.[1]).toMatchObject({ kind: 'hourly', timestamp: Date.UTC(2026, 9, 26, 7) });
    expect(grid[1]?.[0]).toMatchObject({ kind: 'daily', date: '2026-10-27' });
    expect(grid[1]?.[1]).toMatchObject({ kind: 'hourly', timestamp: Date.UTC(2026, 9, 26, 21) });
    expect(grid[2]?.[1]).toMatchObject({ kind: 'hourly', timestamp: Date.UTC(2026, 9, 27, 21) });
    expect(grid[2]?.length).toBeGreaterThan(8);
  });

  it('keeps unique real instants when a local hour repeats at daylight saving transition', () => {
    const now = Date.UTC(2026, 9, 24, 22);
    const days = createForecastSlots(now, 'Europe/Berlin', 3);
    expect(days).toHaveLength(3);
    expect(days[0]?.hours).toContain(Date.UTC(2026, 9, 25, 0));
    expect(days[0]?.hours).toContain(Date.UTC(2026, 9, 25, 1));
  });
});
