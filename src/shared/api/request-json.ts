import { ApiError, type RequestOptions } from './types';

/**
 * requestJson(). Fetch and parse a JSON response with cancellation and a timeout
 *
 * @param url The HTTPS API endpoint including its query parameters.
 * @param options The transport dependencies and bounded request lifetime.
 * @returns A validated transport response awaiting provider schema validation.
 */
export async function requestJson(url: string, options: RequestOptions = {}): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort: (reason: ApiError) => void = () => undefined;
  const interrupted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  /**
   * cancel(). Cancel the HTTP request
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
    if (!response.ok)
      throw new ApiError(
        response.status === 401 || response.status === 403 ? 'credentials' : 'unavailable',
      );
    try {
      const payload: unknown = await Promise.race([response.json(), interrupted]);
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('invalidResponse');
    }
  } catch (error) {
    if (options.signal?.aborted) throw new ApiError('cancelled');
    const reason: unknown = controller.signal.reason;
    if (controller.signal.aborted && reason instanceof ApiError) throw reason;
    if (error instanceof ApiError) throw error;
    throw new ApiError('connection');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
