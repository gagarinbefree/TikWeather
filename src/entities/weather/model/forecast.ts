export interface ForecastHour {
  readonly timestamp: number;
  readonly temperature: number;
  readonly feelsLike: number;
  readonly humidity: number;
  readonly windSpeed: number;
  readonly windDirection: string;
  readonly rainChance: number;
  readonly uv: number;
  readonly pressure: number;
  readonly visibility: number;
  readonly conditionCode: number;
  readonly conditionText: string;
  readonly conditionLocale: 'ru' | 'en';
  readonly isDay: boolean;
}

export interface ForecastDay {
  readonly date: string;
  readonly maximum: number;
  readonly minimum: number;
  readonly humidity: number;
  readonly windSpeed: number;
  readonly rainChance: number;
  readonly uv: number;
  readonly conditionCode: number;
  readonly conditionText: string;
  readonly conditionLocale: 'ru' | 'en';
  readonly sunrise: string | null;
  readonly sunset: string | null;
  readonly hours: readonly ForecastHour[];
}

export interface Forecast {
  readonly days: readonly ForecastDay[];
  readonly intervalHours?: 2 | 3;
}
