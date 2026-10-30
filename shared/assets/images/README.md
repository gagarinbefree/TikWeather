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
