import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { createWeatherGrid } from './create-weather-grid';
import type { WeatherGridOptions } from './types';

/**
 * useWeatherGridStore. Store the current forecast grid
 *
 * @returns The current grid snapshot and its atomic update operation.
 */
export const useWeatherGridStore = defineStore('weather-grid', () => {
  const grid = shallowRef(createWeatherGrid({ now: Date.now(), timeZone: 'UTC', days: [] }));

  /**
   * update. Replace the grid with new forecast cells
   *
   * @param options The complete next forecast grid snapshot.
   */
  function update(options: WeatherGridOptions): void {
    grid.value = createWeatherGrid(options);
  }

  return { grid, update };
});
