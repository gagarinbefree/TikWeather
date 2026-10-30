export const weatherProviderPriority = {
  'open-meteo': 0,
  weatherapi: 1,
  openweathermap: 2,
} as const;

export type WeatherProvider = keyof typeof weatherProviderPriority;
