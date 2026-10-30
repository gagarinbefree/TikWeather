import { messages, type Locale } from '@/shared/locales';

const kilometersPerDisplayUnit: Readonly<Record<Locale, number>> = { ru: 3.6, en: 1.609344 };

/**
 * formatWindSpeed. Show wind in the units selected by the interface language
 *
 * @param kilometersPerHour The normalized wind speed stored by the application
 * @param locale The current interface language
 * @param direction The optional compass code returned by the weather provider
 * @returns The localized speed in meters per second or miles per hour with its direction
 */
export function formatWindSpeed(kilometersPerHour: number, locale: Locale, direction = ''): string {
  const text = messages[locale];
  const directions: Readonly<Record<string, string>> = text.directions;
  const value = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    useGrouping: false,
  }).format(kilometersPerHour / kilometersPerDisplayUnit[locale]);
  return `${value} ${text.windSpeedUnit} ${directions[direction] ?? ''}`.trim();
}
