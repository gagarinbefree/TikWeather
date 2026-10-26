export interface CurrentWeather {
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
  readonly uv: number;
  readonly pressure: number;
  readonly visibility: number;
  readonly conditionCode: number;
  readonly conditionText: string;
  readonly conditionLocale: 'ru' | 'en';
  readonly isDay: boolean;
}
