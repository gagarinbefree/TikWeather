import { createWeatherGrid, type WeatherGrid } from '@/entities/weather';

export const openingTime = Date.parse('2026-10-26T00:30:00Z');

export const fixtureGrid: WeatherGrid = createWeatherGrid({
  now: openingTime,
  timeZone: 'UTC',
  days: [
    {
      date: '2026-10-26',
      hours: [2, 4, 6].map((hour) => Date.UTC(2026, 9, 26, hour)),
    },
    { date: '2026-10-27', hours: [] },
    {
      date: '2026-10-28',
      hours: [2, 4].map((hour) => Date.UTC(2026, 9, 28, hour)),
    },
  ],
});
