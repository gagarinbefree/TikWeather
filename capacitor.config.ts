import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Keep the installed package identity so existing Android apps can update.
  appId: 'com.gagarinbefree.tikweather',
  appName: 'ZoomWeather',
  webDir: 'dist-android',
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
