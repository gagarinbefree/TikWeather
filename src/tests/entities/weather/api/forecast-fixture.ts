const hour = {
  time_epoch: Date.UTC(2026, 9, 26, 7) / 1000,
  temp_c: 9.5,
  feelslike_c: 8.1,
  is_day: 1,
  humidity: 70,
  wind_kph: 11,
  wind_dir: 'SW',
  chance_of_rain: 35,
  uv: 1.2,
  pressure_mb: 1015,
  vis_km: 10,
  condition: { code: 1003, text: 'Partly cloudy' },
};

const day = {
  maxtemp_c: 12,
  mintemp_c: 5,
  avghumidity: 75,
  maxwind_kph: 18,
  daily_chance_of_rain: 60,
  uv: 2,
  condition: { code: 1009, text: 'Overcast' },
};

export const forecastResponse = {
  forecast: {
    forecastday: [
      {
        date: '2026-10-26',
        day,
        astro: { sunrise: '07:45 AM', sunset: '05:28 PM' },
        hour: [hour],
      },
      {
        date: '2026-10-27',
        day: { ...day, maxtemp_c: 10 },
        astro: { sunrise: '07:47 AM', sunset: '05:26 PM' },
        hour: [{ ...hour, time_epoch: Date.UTC(2026, 9, 27, 7) / 1000 }],
      },
      {
        date: '2026-10-28',
        day: { ...day, maxtemp_c: 8 },
        astro: { sunrise: '07:49 AM', sunset: '05:24 PM' },
        hour: [{ ...hour, time_epoch: Date.UTC(2026, 9, 28, 7) / 1000 }],
      },
    ],
  },
};
