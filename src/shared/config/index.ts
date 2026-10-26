/**
 * weatherApiKey
 * @returns The public browser credential supplied locally or by the release workflow.
 */
export function weatherApiKey(): string {
  const key: unknown = import.meta.env['VITE_WEATHER_API_KEY'];
  return typeof key === 'string' ? key : '';
}
