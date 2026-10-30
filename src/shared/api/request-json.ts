import { recordApiRequest } from '@/shared/diagnostics';
import { ApiError, type RequestOptions } from './types';

/**
 * requestJson. Fetch and parse a JSON response with cancellation and a timeout
 *
 * @param url The HTTPS API endpoint including its query parameters.
 * @param options The transport dependencies and bounded request lifetime.
 * @returns A validated transport response awaiting provider schema validation.
 */
export async function requestJson(url: string, options: RequestOptions = {}): Promise<unknown> {
  const started = Date.now();
  let status: number | undefined;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort: (reason: ApiError) => void = () => undefined;
  const interrupted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  /**
   * cancel. Cancel the HTTP request
   */
  function cancel(): void {
    controller.abort(new ApiError('cancelled'));
    rejectAbort(new ApiError('cancelled'));
  }
  options.signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (options.signal?.aborted) throw new ApiError('cancelled');
    timer = setTimeout(() => {
      controller.abort(new ApiError('timeout'));
      rejectAbort(new ApiError('timeout'));
    }, options.timeoutMs ?? 15000);
    const response = await Promise.race([
      (options.fetcher ?? fetch)(url, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      }),
      interrupted,
    ]);
    status = response.status;
    if (!response.ok)
      throw new ApiError(
        response.status === 401 || response.status === 403 ? 'credentials' : 'unavailable',
        response.status,
        response.status === 429 && !response.headers.has('X-Weather-Provider'),
      );
    options.onResponse?.(response);
    try {
      const payload: unknown = await Promise.race([response.json(), interrupted]);
      recordApiRequest(url, Date.now() - started, status);
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('invalidResponse');
    }
  } catch (error) {
    const reason: unknown = controller.signal.reason;
    const failure = options.signal?.aborted
      ? new ApiError('cancelled')
      : controller.signal.aborted && reason instanceof ApiError
        ? reason
        : error instanceof ApiError
          ? error
          : new ApiError('connection');
    recordApiRequest(url, Date.now() - started, status, failure.kind);
    throw failure;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
