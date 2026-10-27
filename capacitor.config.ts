import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gagarinbefree.tikweather',
  appName: 'TikWeather',
  webDir: 'dist-android',
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
