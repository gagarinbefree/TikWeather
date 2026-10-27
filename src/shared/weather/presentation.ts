import conditions from '@assets/weather/conditions.json';
import theme from '@assets/themes/default.json';

const icons = import.meta.glob<string>('/shared/assets/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const colors: Readonly<Record<string, string>> = theme.colors;

/**
 * weatherPresentation
 * @param code The observed provider condition code.
 * @param isDay Whether the location is in daylight.
 * @param card The current or forecast card palette.
 * @returns The original AvaWeather icon and named pastel theme tokens.
 */
export function weatherPresentation(
  code: number,
  isDay: boolean,
  card: 'current' | 'forecast',
): {
  readonly icon: string;
  readonly iconUrl: string;
  readonly style: Readonly<Record<string, string>>;
} {
  const match = conditions.find((item) => item.codes.includes(code));
  const kind = !isDay && match?.nightKind ? match.nightKind : (match?.kind ?? 'Cloudy');
  const descriptor = conditions.find((item) => item.kind === kind);
  const icon = descriptor?.icon ?? 'WeatherCloudy';
  return {
    icon,
    iconUrl: icons[`/shared/assets/icons/${icon}.svg`] ?? '',
    style: {
      '--card-background':
        colors[`Weather.${kind}.${card === 'current' ? 'Current' : 'Forecast'}`] ??
        (card === 'current'
          ? theme.colors['Weather.Cloudy.Current']
          : theme.colors['Weather.Cloudy.Forecast']),
      '--card-accent': colors[`Weather.${kind}.Accent`] ?? theme.colors['Weather.Cloudy.Accent'],
      '--card-header-start':
        colors[`Weather.${kind}.HeaderStart`] ?? theme.colors['Weather.Cloudy.HeaderStart'],
      '--card-header-end':
        colors[`Weather.${kind}.HeaderEnd`] ?? theme.colors['Weather.Cloudy.HeaderEnd'],
    },
  };
}
