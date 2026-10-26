import { nextTick } from 'vue';
import { vi } from 'vitest';

export interface BrowserTestEnvironment {
  readonly frames: ReadonlyMap<number, FrameRequestCallback>;
  readonly observers: ReadonlySet<ResizeObserver>;
  readonly settle: () => Promise<void>;
  readonly resize: () => Promise<void>;
  readonly restore: () => void;
}

/**
 * installBrowserEnvironment
 * @returns Controlled browser geometry and animation frames for component integration tests.
 */
export function installBrowserEnvironment(): BrowserTestEnvironment {
  let frameId = 0;
  let time = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const observers = new Set<ResizeObserver>();
  const callbacks = new Map<ResizeObserver, ResizeObserverCallback>();

  /**
   * createObserver
   * @param callback The observer notification callback.
   * @returns A browser observer substitute with explicit cleanup.
   */
  function createObserver(callback: ResizeObserverCallback): ResizeObserver {
    const observer: ResizeObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: () => {
        observers.delete(observer);
        callbacks.delete(observer);
      },
    };
    observers.add(observer);
    callbacks.set(observer, callback);
    return observer;
  }

  vi.stubGlobal('ResizeObserver', createObserver);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(393);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(851);
  const methods = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const;
  const originals = methods.map((name) => Object.getOwnPropertyDescriptor(Element.prototype, name));
  for (const name of methods) {
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      value: vi.fn(() => (name === 'hasPointerCapture' ? false : undefined)),
    });
  }

  /**
   * settle
   * @returns A promise that resolves after queued browser frames and Vue updates finish.
   */
  async function settle(): Promise<void> {
    for (let index = 0; index < 4; index++) {
      const batch = [...frames.values()];
      frames.clear();
      time += 1000;
      for (const callback of batch) callback(time);
      await nextTick();
      await Promise.resolve();
    }
  }

  /**
   * resize
   * @returns A promise that resolves after all observers receive a geometry update.
   */
  async function resize(): Promise<void> {
    for (const [observer, callback] of callbacks) callback([], observer);
    await settle();
  }

  /**
   * restore
   */
  function restore(): void {
    for (const [index, name] of methods.entries()) {
      const original = originals[index];
      if (original) Object.defineProperty(Element.prototype, name, original);
      else Reflect.deleteProperty(Element.prototype, name);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }

  return { frames, observers, settle, resize, restore };
}
