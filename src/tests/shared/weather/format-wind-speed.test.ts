import { describe, expect, it } from 'vitest';
import { formatWindSpeed } from '@/shared/weather';

describe('Localized wind speed', () => {
  it.each([
    [36, 'ru', '10 м/с'],
    [36, 'en', '22.4 mph'],
    [9, 'ru', '2,5 м/с'],
    [9, 'en', '5.6 mph'],
    [0, 'ru', '0 м/с'],
    [0, 'en', '0 mph'],
  ] as const)('formats %s kilometers per hour for %s as %s', (speed, locale, expected) => {
    expect(formatWindSpeed(speed, locale)).toBe(expected);
  });

  it('translates compass directions and omits unknown directions', () => {
    expect(formatWindSpeed(9, 'ru', 'WSW')).toBe('2,5 м/с ЗЮЗ');
    expect(formatWindSpeed(9, 'en', 'WSW')).toBe('5.6 mph WSW');
    expect(formatWindSpeed(9, 'ru', 'unknown')).toBe('2,5 м/с');
  });
});
