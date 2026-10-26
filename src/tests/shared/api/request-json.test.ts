import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, requestJson } from '@/shared/api';

afterEach(() => vi.useRealTimers());

describe('requestJson', () => {
  it('sends a simple cancellable GET without custom headers or credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"value":1}'));
    const result = await requestJson('https://example.test/', { fetcher });
    expect(result).toEqual({ value: 1 });
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.test/');
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.credentials).toBe('omit');
    expect(init?.referrerPolicy).toBe('no-referrer');
    expect(init?.headers).toBeUndefined();
  });

  it('sanitizes transport errors so URLs and keys cannot become error messages', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('https://secret?key=private'));
    await expect(requestJson('https://secret?key=private', { fetcher })).rejects.toMatchObject({
      kind: 'connection',
      message: 'connection',
    });
  });

  it('distinguishes HTTP and malformed JSON failures', async () => {
    await expect(
      requestJson('https://example.test/', {
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 403 })),
      }),
    ).rejects.toMatchObject({ kind: 'credentials' });
    await expect(
      requestJson('https://example.test/', {
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response('invalid')),
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('bounds even an unresponsive transport and preserves caller cancellation', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => undefined));
    const timed = requestJson('https://example.test/', { fetcher, timeoutMs: 100 });
    const timedCheck = expect(timed).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(100);
    await timedCheck;
    const controller = new AbortController();
    const cancelled = requestJson('https://example.test/', { fetcher, signal: controller.signal });
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ kind: 'cancelled' });
  });
});
