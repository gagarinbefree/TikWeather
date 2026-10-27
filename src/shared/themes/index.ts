import theme from '@assets/themes/default.json';

export const baseThemeStyle: Readonly<Record<string, string>> = {
  '--weather-page': theme.colors.Page,
  '--weather-ink': theme.colors.Ink,
  '--weather-muted': theme.colors.Muted,
  '--weather-accent': theme.colors['Weather.Cloudy.Accent'],
  '--weather-surface': theme.colors['Weather.Cloudy.Forecast'],
  '--weather-error-background': theme.colors['Error.Background'],
};
