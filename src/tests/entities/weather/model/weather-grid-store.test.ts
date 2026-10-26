import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWeatherGridStore } from '@/entities/weather';

describe('weather grid store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with one current cell and no invented forecast days', () => {
    const store = useWeatherGridStore();

    expect(store.grid.map((row) => row.map((cell) => cell.kind))).toEqual([['current']]);
  });

  it('replaces a snapshot atomically when provider data arrives', () => {
    const store = useWeatherGridStore();
    const now = Date.parse('2026-10-26T12:00:00Z');
    store.update({ now, timeZone: 'UTC', days: [] });
    const originalCell = store.grid[0]?.[0];

    store.update({ now, timeZone: 'UTC', days: [{ date: '2026-10-27', hours: [] }] });

    expect(store.grid).toHaveLength(2);
    expect(store.grid[0]?.[0]).toEqual(originalCell);
  });

  it('preserves the previous snapshot when new input is invalid', () => {
    const store = useWeatherGridStore();
    const previous = store.grid;

    expect(() => {
      store.update({ now: NaN, timeZone: 'UTC', days: [] });
    }).toThrow(RangeError);
    expect(store.grid).toBe(previous);
  });
});
