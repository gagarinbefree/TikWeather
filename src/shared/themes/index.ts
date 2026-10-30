import theme from '@assets/themes/default.json';

export const baseThemeStyle: Readonly<Record<string, string>> = {
  '--weather-page': theme.colors.Page,
  '--weather-ink': theme.colors.Ink,
  '--weather-muted': theme.colors.Muted,
  '--weather-accent': theme.colors['Weather.Cloudy.Accent'],
  '--weather-surface': theme.colors['Weather.Cloudy.Forecast'],
  '--weather-error-background': theme.colors['Error.Background'],
};

export const sunnyThemeStyle: Readonly<Record<string, string>> = {
  ...baseThemeStyle,
  '--card-background': theme.colors['Weather.ClearDay.Forecast'],
  '--card-accent': theme.colors['Weather.ClearDay.Accent'],
  '--card-header-start': theme.colors['Weather.ClearDay.HeaderStart'],
  '--card-header-end': theme.colors['Weather.ClearDay.HeaderEnd'],
  '--card-on-accent': theme.colors.White,
};
