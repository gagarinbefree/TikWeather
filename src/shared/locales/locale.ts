import countries from './russian-countries.json';
import englishConditions from './conditions.en.json';
import russianConditions from './conditions.ru.json';
import wmoConditions from './conditions.wmo.json';
import { messages } from './messages';

export type Locale = 'ru' | 'en';
const russian: Readonly<Record<string, string | { readonly day: string; readonly night: string }>> =
  russianConditions;
const wmo: Readonly<Record<string, { readonly ru: string; readonly en: string }>> = wmoConditions;

/**
 * browserLocale
 * @returns The initial supported language before the country is known.
 */
export function browserLocale(): Locale {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}

/**
 * localeForCountry
 * @param country The ISO code or provider country name.
 * @returns The supported language selected using the AvaWeather country policy.
 */
export function localeForCountry(country: string): Locale {
  const normalized = country.trim().toLowerCase();
  return countries.some((names) => names.some((name) => name.toLowerCase() === normalized))
    ? 'ru'
    : 'en';
}

/**
 * countryLabel
 * @param country The country name returned by the provider.
 * @param locale The current interface language.
 * @returns A localized country name when its ISO code is known.
 */
export function countryLabel(country: string, locale: Locale): string {
  const normalized = country.trim().toLowerCase();
  const code = countries.find((names) =>
    names.some((name) => name.toLowerCase() === normalized),
  )?.[0];
  return code ? (new Intl.DisplayNames(locale, { type: 'region' }).of(code) ?? country) : country;
}

/**
 * conditionLabel
 * @param code The active provider condition code.
 * @param isDay Whether the observation is in daylight.
 * @param locale The current interface language.
 * @param fallback The provider text in the matching language when a new code is introduced.
 * @returns A condition translated without another weather request.
 */
export function conditionLabel(
  code: number,
  isDay: boolean,
  locale: Locale,
  fallback = '',
): string {
  if (locale === 'ru') {
    const translatedWmo = wmo[String(code)];
    if (translatedWmo) return translatedWmo.ru;
    const translated = russian[String(code)];
    if (typeof translated === 'string') return translated;
    if (translated) return isDay ? translated.day : translated.night;
  } else {
    const translatedWmo = wmo[String(code)];
    if (translatedWmo) return translatedWmo.en;
    const translated = englishConditions.find((condition) => condition.code === code);
    if (translated) return isDay ? translated.day : translated.night;
  }
  const providerText = fallback.trim();
  return providerText
    ? providerText.charAt(0).toLocaleUpperCase(locale) + providerText.slice(1)
    : messages[locale].unknownCondition;
}
