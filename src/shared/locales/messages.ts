export const messages = {
  ru: {
    appName: 'TikWeather',
    loadingWeather: 'Загрузка погоды',
    weather: 'Погода',
    invalidTimestamp: 'Некорректное время прогноза',
    invalidDate: 'Некорректная дата прогноза',
    duplicateDate: 'Даты прогноза не должны повторяться',
    wrongDay: 'Время прогноза не соответствует местной дате',
    invalidInterval: 'Интервал прогноза должен составлять два или три часа',
    missingDatePart: 'Не удалось определить местную дату',
  },
  en: {
    appName: 'TikWeather',
    loadingWeather: 'Loading weather',
    weather: 'Weather',
    invalidTimestamp: 'Invalid forecast timestamp',
    invalidDate: 'Invalid forecast date',
    duplicateDate: 'Forecast dates must be unique',
    wrongDay: 'Forecast timestamp does not belong to its local date',
    invalidInterval: 'Forecast interval must be two or three hours',
    missingDatePart: 'Unable to determine the local date',
  },
} as const satisfies Record<'ru' | 'en', Record<string, string>>;
