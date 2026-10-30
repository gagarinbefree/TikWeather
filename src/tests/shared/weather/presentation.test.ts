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

describe('weather background drawings', () => {
  it.each([
    [1000, 'clear'],
    [1003, 'partly_cloudy'],
    [1006, 'cloudy'],
    [1009, 'overcast'],
    [1135, 'fog'],
    [1183, 'light_rain'],
    [1189, 'rain'],
    [1195, 'heavy_rain'],
    [1213, 'light_snow'],
    [1219, 'snow'],
    [1225, 'heavy_snow'],
    [1087, 'thunderstorm'],
  ] as const)('uses the optimized drawing for condition %i', (code, drawing) => {
    expect(weatherPresentation(code, true).style['--card-pattern']).toContain(`${drawing}.webp`);
  });

  it('keeps the drawing when the condition uses its night palette', () => {
    expect(weatherPresentation(1000, false).style['--card-pattern']).toContain('clear.webp');
    expect(weatherPresentation(1003, false).style['--card-pattern']).toContain(
      'partly_cloudy.webp',
    );
  });

  it('uses a harmless default drawing for an unknown weather condition', () => {
    expect(weatherPresentation(9999, true).style['--card-pattern']).toContain('cloudy.webp');
  });
});
