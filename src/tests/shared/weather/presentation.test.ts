import { describe, expect, it } from 'vitest';
import { weatherPresentation } from '@/shared/weather';
import theme from '@assets/themes/default.json';

describe('weather presentation', () => {
  it('uses the AvaWeather current and forecast surfaces for the same condition', () => {
    const current = weatherPresentation(1000, true, 'current');
    const forecast = weatherPresentation(1000, true, 'forecast');

    expect(current.icon).toBe('WeatherSunny');
    expect(forecast.icon).toBe(current.icon);
    expect(current.style['--card-background']).toBe(theme.colors['Weather.ClearDay.Current']);
    expect(forecast.style['--card-background']).toBe(theme.colors['Weather.ClearDay.Forecast']);
    expect(forecast.style['--card-accent']).toBe(theme.colors['Weather.ClearDay.Accent']);
    expect(forecast.style['--card-header-start']).toBe(
      theme.colors['Weather.ClearDay.HeaderStart'],
    );
  });

  it('keeps the night icon and forecast palette together', () => {
    const forecast = weatherPresentation(1000, false, 'forecast');
    expect(forecast.icon).toBe('WeatherMoon');
    expect(forecast.style['--card-background']).toBe(theme.colors['Weather.ClearNight.Forecast']);
  });
});
