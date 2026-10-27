import { describe, expect, it } from 'vitest';
import { weatherPresentation } from '@/shared/weather';
import theme from '@assets/themes/default.json';

describe('weather presentation', () => {
  it('uses one pastel surface for weather cards with the same condition', () => {
    const presentation = weatherPresentation(1000, true);

    expect(presentation.icon).toBe('WeatherSunny');
    expect(presentation.style['--card-background']).toBe(theme.colors['Weather.ClearDay.Forecast']);
    expect(presentation.style['--card-accent']).toBe(theme.colors['Weather.ClearDay.Accent']);
    expect(presentation.style['--card-header-start']).toBe(
      theme.colors['Weather.ClearDay.HeaderStart'],
    );
  });

  it('keeps the night icon and forecast palette together', () => {
    const forecast = weatherPresentation(1000, false);
    expect(forecast.icon).toBe('WeatherMoon');
    expect(forecast.style['--card-background']).toBe(theme.colors['Weather.ClearNight.Forecast']);
  });
});
