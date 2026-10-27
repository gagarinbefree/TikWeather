# Android build

TikWeather uses the same Vue weather cards and weather services on the web and in Android. The Android entry uses Capacitor Geolocation for device coordinates and resolves the city and country on the device. It falls back to GeoJS when location permission is unavailable. CapacitorHttp provides native HTTPS requests in the Android WebView.

## Local build

Install Node 24, JDK 21 and the Android SDK with API 36 and build tools 36.0.0. Set `ANDROID_HOME` and `JAVA_HOME`, then run:

```sh
npm ci
npm run android:sync
```

Open `android/` in Android Studio, or build an installable debug APK with `android/gradlew assembleDebug`. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. On Windows, use `android\gradlew.bat assembleDebug`.

The optional `VITE_WEATHER_API_KEY` and `VITE_OPENWEATHERMAP_API_KEY` environment variables are embedded at build time. Open-Meteo remains available without a key. GitHub Actions builds an Android debug APK after the test job and uploads it as a workflow artifact. Debug APKs use a development signing key, so they are for testing rather than app store distribution.

The GitHub Pages build and the Android build use separate Vite modes. Both import icons, fonts, weather data, and colors from `shared/assets` at the repository root. Vite serves `shared/assets/branding` as the browser and PWA icon directory; Gradle copies the same 512-pixel icon into generated Android resources for the launcher and splash screen. Android assets use relative paths and do not register the browser service worker.
