import { describe, expect, it } from 'vitest';
import { weatherPresentation } from '@/shared/weather';
import theme from '@assets/themes/default.json';
import catalog from '@assets/weather/conditions.json';
import englishConditions from '@/shared/locales/conditions.en.json';
import wmoConditions from '@/shared/locales/conditions.wmo.json';

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
    expect(weatherPresentation(code, true).style['--card-pattern']).toContain(`/${drawing}.webp`);
  });

  it('keeps the drawing when the condition uses its night palette', () => {
    expect(weatherPresentation(1000, false).style['--card-pattern']).toContain('/clear.webp');
    expect(weatherPresentation(1003, false).style['--card-pattern']).toContain(
      '/partly_cloudy.webp',
    );
  });

  it('uses a harmless default drawing for an unknown weather condition', () => {
    expect(weatherPresentation(9999, true).style['--card-pattern']).toContain('/cloudy.webp');
  });
});

it.each([true, false])(
  'uses the clear drawing for mainly clear Open Meteo weather with daylight %s',
  (isDay) => {
    expect(weatherPresentation(1, isDay).style['--card-pattern']).toContain('clear.webp');
    expect(weatherPresentation(2, isDay).style['--card-pattern']).toContain('partly_cloudy.webp');
  },
);

// Expected groups follow the provider descriptions linked in the image resource notes.
const backgroundConditions = [
  ['clear', [0, 1, 1000, 800]],
  ['partly_cloudy', [2, 1003, 801, 802]],
  ['cloudy', [1006, 803]],
  ['overcast', [3, 1009, 804]],
  [
    'fog',
    [
      45, 48, 1012, 1015, 1018, 1021, 1024, 1027, 1030, 1033, 1036, 1039, 1042, 1045, 1048, 1135,
      1147, 701, 711, 721, 731, 741, 751, 761, 762, 771, 781,
    ],
  ],
  ['light_rain', [51, 56, 61, 66, 80, 1150, 1153, 1180, 1183, 1198, 1240, 300, 310, 500, 520]],
  ['rain', [53, 63, 81, 1063, 1072, 1168, 1186, 1189, 301, 311, 313, 321, 501, 511, 521, 531]],
  [
    'heavy_rain',
    [55, 57, 65, 67, 82, 1171, 1192, 1195, 1201, 1243, 1246, 302, 312, 314, 502, 503, 504, 522],
  ],
  ['light_snow', [71, 85, 1204, 1210, 1213, 1249, 1255, 1261, 600, 612, 615, 620]],
  ['snow', [73, 77, 1066, 1069, 1216, 1219, 1237, 601, 611, 613, 616, 621]],
  ['heavy_snow', [75, 86, 1114, 1117, 1207, 1222, 1225, 1252, 1258, 1264, 602, 622]],
  [
    'thunderstorm',
    [
      95, 96, 97, 99, 1087, 1273, 1276, 1279, 1282, 200, 201, 202, 210, 211, 212, 221, 230, 231,
      232,
    ],
  ],
] as const;

it.each(backgroundConditions)(
  'matches the %s drawing to its documented weather conditions',
  (drawing, codes) => {
    for (const code of codes) {
      for (const isDay of [true, false]) {
        expect(
          weatherPresentation(code, isDay).style['--card-pattern'],
          `Condition ${String(code)} with daylight ${String(isDay)}`,
        ).toContain(`/${drawing}.webp`);
      }
    }
  },
);

it.each([1072, 511])(
  'uses a rain icon instead of snow for freezing precipitation code %i',
  (code) => {
    expect(weatherPresentation(code, true).icon).toBe('WeatherRain');
  },
);

it('covers every known provider condition exactly once in the audited drawing groups', () => {
  const codes = catalog.flatMap((item) => item.codes);
  const audited = backgroundConditions.flatMap(([, group]) => [...group]);
  expect(new Set(codes).size).toBe(codes.length);
  expect([...codes].sort((a, b) => a - b)).toEqual([...audited].sort((a, b) => a - b));
  const translated = [
    ...englishConditions.map((item) => item.code),
    ...Object.keys(wmoConditions).map(Number),
  ];
  for (const code of translated) expect(codes, String(code)).toContain(code);
  for (const item of catalog) {
    const overrides = item.backgrounds?.flatMap((background) => background.codes) ?? [];
    expect(new Set(overrides).size).toBe(overrides.length);
    for (const code of overrides) expect(item.codes, item.kind).toContain(code);
  }
});
