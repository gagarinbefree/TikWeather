import type { App } from 'vue';
import {
  init,
  captureException,
  addBreadcrumb,
  globalHandlersIntegration,
  browserApiErrorsIntegration,
  vueIntegration,
  type ErrorEvent,
} from '@sentry/vue';

export type DiagnosticPlatform = 'Browser' | 'PWA' | 'Android';
export type DiagnosticOperation =
  'current' | 'forecast' | 'location' | 'navigation' | 'request' | 'unhandled';
const failures = new Set([
  'location',
  'connection',
  'timeout',
  'credentials',
  'unavailable',
  'invalidResponse',
  'configuration',
  'cancelled',
]);
const operations = new Set<DiagnosticOperation>([
  'current',
  'forecast',
  'location',
  'navigation',
  'request',
  'unhandled',
]);
const recentRequests: string[] = [];
const lastEvents = new Map<string, number>();
let enabled = false;
let platform: DiagnosticPlatform = 'Browser';

/**
 * validDsn. Accept a public HTTPS Sentry compatible collector address
 *
 * @param value The collector DSN from build or local configuration.
 * @returns Whether the address contains a public key and numeric project identifier.
 */
function validDsn(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      /^[a-zA-Z0-9]{1,128}$/.test(url.username) &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /\/\d+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * failureKind. Read a bounded failure category without inspecting private error text
 *
 * @param error The failure returned by an application or browser API.
 * @returns A known weather failure or the generic unexpected category.
 */
function failureKind(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string' &&
    failures.has(error.kind)
  )
    return error.kind;
  return 'unexpected';
}

/**
 * requestName. Identify an API without retaining its host query or coordinates
 *
 * @param address The request address used only to select a fixed diagnostic label.
 * @returns A provider and operation label from the known application endpoints.
 */
function requestName(address: string): string {
  try {
    const url = new URL(address);
    if (url.hostname === 'get.geojs.io') return 'GeoJS location';
    if (url.hostname === 'api.bigdatacloud.net') return 'Reverse geocoding';
    if (url.pathname.startsWith('/api/location/openweathermap/')) return 'OpenWeatherMap geocoding';
    if (url.pathname.startsWith('/api/location/weatherapi/')) return 'WeatherAPI geocoding';
    if (url.pathname.startsWith('/api/open-meteo/')) return 'Open-Meteo weather';
    if (url.pathname.startsWith('/api/openweathermap/')) return 'OpenWeatherMap weather';
    if (url.pathname.startsWith('/api/weatherapi/'))
      return url.pathname.endsWith('/current.json') ? 'WeatherAPI current' : 'WeatherAPI forecast';
  } catch {
    return 'Other API';
  }
  return 'Other API';
}

/**
 * sanitizeEvent. Keep safe failure details and bounded request history for Hawk
 *
 * @param event The SDK event before it reaches the collector.
 * @returns A safe event or no event for a repeated failure.
 */
export function sanitizeEvent(event: ErrorEvent): ErrorEvent | null {
  const rawOperation = event.tags?.['operation'];
  const operation =
    typeof rawOperation === 'string' && operations.has(rawOperation as DiagnosticOperation)
      ? rawOperation
      : 'unhandled';
  const rawFailure = event.tags?.['failure'];
  const failure =
    typeof rawFailure === 'string' && failures.has(rawFailure) ? rawFailure : 'unexpected';
  const rawEndpoint = event.tags?.['endpoint'];
  const endpoint =
    typeof rawEndpoint === 'string' &&
    /^(GeoJS location|Reverse geocoding|Open-Meteo weather|OpenWeatherMap weather|WeatherAPI current|WeatherAPI forecast|OpenWeatherMap geocoding|WeatherAPI geocoding|Other API)$/.test(
      rawEndpoint,
    )
      ? rawEndpoint
      : '';
  const signature = `${operation}:${failure}:${endpoint}`;
  const now = Date.now();
  const previous = lastEvents.get(signature);
  if (previous !== undefined && now - previous < 60_000) return null;
  if (lastEvents.size >= 64) lastEvents.clear();
  lastEvents.set(signature, now);
  const safe: ErrorEvent = {
    type: undefined,
    level: event.level ?? 'error',
    message:
      operation === 'unhandled'
        ? 'Unexpected application error'
        : `Weather ${operation} failed: ${failure}`,
    tags: {
      application: 'ZoomWeather',
      platform,
      operation,
      failure,
      ...(endpoint ? { endpoint } : {}),
    },
    fingerprint: ['ZoomWeather', operation, failure, endpoint],
    extra: { recent_requests: [...recentRequests] },
  };
  if (event.event_id) safe.event_id = event.event_id;
  if (event.timestamp !== undefined) safe.timestamp = event.timestamp;
  if (event.release) safe.release = event.release;
  if (event.environment) safe.environment = event.environment;
  const exceptions = event.exception?.values?.slice(0, 3);
  if (exceptions?.length)
    safe.exception = {
      values: exceptions.map((exception) => ({
        type: /^[\w.]{1,80}$/.test(exception.type ?? '') ? (exception.type ?? 'Error') : 'Error',
        value: safe.message ?? 'Unexpected application error',
        ...(exception.stacktrace?.frames
          ? {
              stacktrace: {
                frames: exception.stacktrace.frames.slice(-40).map((frame) => ({
                  filename:
                    (frame.filename ?? '')
                      .split(/[\\/]/)
                      .at(-1)
                      ?.split(/[?#]/)[0]
                      ?.match(/^[\w.-]+\.(?:js|mjs|cjs|ts|vue)$/)?.[0] ?? 'application',
                  ...(frame.function && /^[\w.$<> ]{1,100}$/.test(frame.function)
                    ? { function: frame.function }
                    : {}),
                  ...(frame.lineno !== undefined ? { lineno: frame.lineno } : {}),
                  ...(frame.colno !== undefined ? { colno: frame.colno } : {}),
                })),
              },
            }
          : {}),
      })),
    };
  return safe;
}

/**
 * initializeDiagnostics. Connect Vue and browser failures to the configured Hawk project
 *
 * @param app The application before its first component is mounted.
 * @param applicationPlatform The browser PWA or Android runtime.
 * @param dsn The public collector DSN supplied by the build.
 */
export function initializeDiagnostics(
  app: App,
  applicationPlatform: DiagnosticPlatform,
  dsn = import.meta.env['VITE_HAWK_DSN'] ?? '',
): void {
  enabled = false;
  platform = applicationPlatform;
  recentRequests.length = 0;
  lastEvents.clear();
  if (!validDsn(dsn)) return;
  try {
    init({
      app,
      dsn,
      release: `zoomweather@${import.meta.env['VITE_APP_VERSION'] ?? 'development'}`,
      environment: import.meta.env.PROD ? 'production' : 'development',
      defaultIntegrations: false,
      integrations: [
        globalHandlersIntegration(),
        browserApiErrorsIntegration(),
        vueIntegration({ attachProps: false }),
      ],
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      sendClientReports: false,
      maxBreadcrumbs: 30,
      beforeSend: sanitizeEvent,
      transportOptions: {
        bufferSize: 20,
        fetchOptions: { credentials: 'omit', referrerPolicy: 'no-referrer' },
      },
    });
    enabled = true;
  } catch {
    enabled = false;
  }
}

/**
 * reportFailure. Report an application failure while preserving weather and retry behavior
 *
 * @param error The handled failure without exposing its raw text.
 * @param operation The application operation that failed.
 * @param retained Whether saved weather remains available to the user.
 */
export function reportFailure(
  error: unknown,
  operation: DiagnosticOperation,
  retained = false,
): void {
  const failure = failureKind(error);
  if (!enabled || failure === 'cancelled') return;
  try {
    captureException(error instanceof Error ? error : new Error(failure), {
      level: retained ? 'warning' : 'error',
      tags: { operation, failure },
    });
  } catch {
    // Diagnostics transport must not alter the application state.
  }
}

/**
 * recordApiRequest. Keep a safe request breadcrumb and report failed API attempts
 *
 * @param address The original address used only to select a fixed API name.
 * @param elapsedMs The time spent waiting for the request.
 * @param status The received HTTP status when available.
 * @param failure The safe transport failure category when the request failed.
 */
export function recordApiRequest(
  address: string,
  elapsedMs: number,
  status?: number,
  failure?: string,
): void {
  if (!enabled) return;
  const endpoint = requestName(address);
  const duration = Math.max(0, Math.min(180_000, Math.round(elapsedMs)));
  const outcome = failure && failures.has(failure) ? failure : 'success';
  const httpStatus =
    status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined;
  recentRequests.push(
    `${new Date().toISOString()} ${endpoint} ${outcome} ${String(duration)}ms${httpStatus ? ` HTTP=${String(httpStatus)}` : ''}`,
  );
  if (recentRequests.length > 30) recentRequests.shift();
  try {
    addBreadcrumb({
      category: 'api',
      level: outcome === 'success' ? 'info' : 'warning',
      message: endpoint,
      data: { duration_ms: duration, status: httpStatus, outcome },
    });
    if (outcome !== 'success' && outcome !== 'cancelled')
      captureException(new Error(outcome), {
        level: 'warning',
        tags: { operation: 'request', failure: outcome, endpoint },
      });
  } catch {
    // A collector failure must not trigger another API failure.
  }
}
