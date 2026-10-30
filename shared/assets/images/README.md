# Weather backgrounds

The PNG files are the supplied original drawings. Keep them unchanged.
The WebP files are used by the site, PWA and Android app.

Run `node tools/prepare-weather-patterns.mjs` from the project root to regenerate the WebP files with the installed Playwright Chrome browser.
The script detects the ink bounds, chooses the smallest shared content width and height, then crops each drawing around its content center.
It does not resize, retouch, feather or blend the drawings.
The current common crop is 338 by 275 pixels. WebP quality is 82 percent.

Cards repeat the images at their natural size. The condition catalog in `shared/assets/weather/conditions.json` selects the drawing, including rain and snow intensity.
The shared theme controls the background opacity through `weatherPattern.opacity`.
Only the WebP files are included in application builds and the PWA offline cache.

## Drawing audit

All twelve WebP files were visually inspected against their names.

| Drawing              | Weather shown                                 |
| -------------------- | --------------------------------------------- |
| `clear.webp`         | Clear or mainly clear sky with prominent suns |
| `partly_cloudy.webp` | Mixed sun and clouds                          |
| `cloudy.webp`        | Clouds without dense shading                  |
| `overcast.webp`      | Dense shaded clouds                           |
| `fog.webp`           | Mist lines across the landscape               |
| `light_rain.webp`    | Light rainfall                                |
| `rain.webp`          | Rain with umbrellas and puddles               |
| `heavy_rain.webp`    | Dense heavy rain and wind strokes             |
| `light_snow.webp`    | Light snowfall                                |
| `snow.webp`          | Snowfall with snowmen                         |
| `heavy_snow.webp`    | Dense snow and blowing wind                   |
| `thunderstorm.webp`  | Storm clouds and lightning                    |

Condition meanings follow the official [Open Meteo WMO table](https://open-meteo.com/en/docs#weather_variable_documentation), [WeatherAPI catalog](https://www.weatherapi.com/docs/weather_conditions.json) and [OpenWeather condition table](https://openweathermap.org/api/weather-conditions).

Use light drawings for explicitly light or slight precipitation, normal drawings for unspecified or moderate intensity, and heavy drawings for dense, heavy, violent or torrential precipitation.
A provider condition described as moderate or heavy uses the heavy drawing. Thunder takes priority over rain or snow intensity.
Freezing drizzle and freezing rain use rain drawings. Sleet, snow grains and ice pellets use the nearest snow drawing because this set has no separate artwork for those conditions.
Haze, smoke and dust use the fog drawing as the nearest atmospheric visibility illustration. The existing generic atmosphere group also covers squalls and tornadoes; no exact drawings exist for these events.
Day and night share the supplied drawings while icons and color palettes retain their day and night variants.
