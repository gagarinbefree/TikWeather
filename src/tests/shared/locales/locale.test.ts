import { describe, expect, it } from 'vitest';
import { conditionLabel, countryLabel, localeForCountry, messages } from '@/shared/locales';

describe('weather localization', () => {
  it.each(['Russia', 'RU', 'Kazakhstan', 'Ukraine', 'Latvia'])(
    'selects Russian for %s',
    (country) => {
      expect(localeForCountry(country)).toBe('ru');
    },
  );
  it('selects English elsewhere and translates descriptions independently of the response language', () => {
    expect(localeForCountry('Finland')).toBe('en');
    expect(countryLabel('Russia', 'ru')).toBe('Россия');
    expect(countryLabel('Finland', 'en')).toBe('Finland');
    expect(conditionLabel(1000, false, 'ru')).toBe('Ясно');
    expect(conditionLabel(1009, true, 'ru')).toBe('Пасмурно');
    expect(conditionLabel(1009, true, 'en')).toBe('Overcast');
    expect(conditionLabel(800, true, 'ru', 'ясно')).toBe('Ясно');
    expect(conditionLabel(500, true, 'en', 'light rain')).toBe('Light rain');
    expect(conditionLabel(9999, true, 'ru')).toBe(messages.ru.unknownCondition);
    expect(messages.ru.uv).toBe('УФ-индекс');
    expect(messages.ru.rainChance).toBe('Осадки');
    expect(messages.en.uv).toBe('UV Index');
    expect(messages.ru.loadingWeather).toBe('Загружаем погоду...');
    expect(messages.en.loadingWeather).toBe('Loading weather...');
    expect(messages.ru.locating).toBe('Определяем местоположение...');
    expect(messages.en.locating).toBe('Detecting location...');
    expect(Object.keys(messages.ru).sort()).toEqual(Object.keys(messages.en).sort());
  });
});

it.each([
  ['GB', 'United Kingdom'],
  ['FI', 'Finland'],
  ['US', 'United States'],
])('shows the full country name for %s', (code, name) => {
  expect(countryLabel(code, 'en')).toBe(name);
});

it('translates the heavy thunderstorm reported by Open Meteo', () => {
  expect(conditionLabel(97, true, 'ru')).toBe('Сильная гроза');
  expect(conditionLabel(97, false, 'en')).toBe('Heavy thunderstorm');
});
