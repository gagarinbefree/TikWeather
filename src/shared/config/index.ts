import configuration from '@assets/config/weather-server.json';
import { ApiError } from '@/shared/api/types';

/**
 * weatherServerUrl. Read the public backend address without loading provider credentials
 *
 * @returns The validated HTTPS backend address or a local development address.
 */
export function weatherServerUrl(): URL {
  const override: unknown = import.meta.env['VITE_WEATHER_SERVER_URL'];
  try {
    const url = new URL(
      typeof override === 'string' && override.trim() ? override : configuration.baseUrl,
    );
    const local = import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new ApiError('configuration');
    return url;
  } catch {
    throw new ApiError('configuration');
  }
}
