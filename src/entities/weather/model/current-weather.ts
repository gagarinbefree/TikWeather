export interface CurrentWeather {
  readonly serverCachedAt?: number;
  readonly city: string;
  readonly region: string;
  readonly country: string;
  readonly timeZone: string;
  readonly observedAt: number;
  readonly temperature: number;
  readonly feelsLike: number;
  readonly humidity: number;
  readonly windSpeed: number;
  readonly windDirection: string;
  readonly uv: number | null;
  readonly pressure: number;
  readonly visibility: number | null;
  readonly conditionCode: number;
  readonly conditionText: string;
  readonly conditionLocale: 'ru' | 'en';
  readonly isDay: boolean;
}
