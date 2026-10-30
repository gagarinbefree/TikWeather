import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PwaUpdatePrompt from '@/app/ui/PwaUpdatePrompt.vue';
import theme from '@assets/themes/default.json';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement): void {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement): void {
      this.open = false;
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'setPointerCapture');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

/**
 * pointer. Send pointer coordinates through the browser event API
 *
 * @param target The element receiving the pointer event
 * @param type The pointer event name
 * @param options The pointer identity and coordinates
 * @returns A promise that resolves after Vue handles the event
 */
async function pointer(
  target: { readonly element: Element },
  type: string,
  options: MouseEventInit & { readonly pointerId: number },
): Promise<void> {
  const event = new MouseEvent(type, { bubbles: true, ...options });
  Object.defineProperty(event, 'pointerId', { value: options.pointerId });
  target.element.dispatchEvent(event);
  await nextTick();
}

describe('PWA update prompt', () => {
  it('offers two localized Bootstrap actions in a sunny modal card with a decorative logo', async () => {
    const wrapper = mount(PwaUpdatePrompt, { props: { locale: 'ru' } });
    const dialog = wrapper.get('dialog');
    expect(dialog.attributes('open')).toBeDefined();
    expect(wrapper.get('h2').text()).toBe('Доступна новая версия');
    expect(wrapper.findAll('.btn')).toHaveLength(2);
    expect(wrapper.get('[data-action="dismiss"]').text()).toBe('Отмена');
    expect(wrapper.get('.pwa-update__logo').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.pwa-update__card').attributes('style')).toContain(
      theme.colors['Weather.ClearDay.Forecast'],
    );
    await wrapper.get('button[data-action="update"]').trigger('click');
    await wrapper.get('button[data-action="dismiss"]').trigger('click');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
    wrapper.unmount();
  });

  it('uses the APK download link for Android updates', () => {
    const wrapper = mount(PwaUpdatePrompt, {
      props: {
        locale: 'en',
        updateUrl:
          'https://github.com/gagarinbefree/TikWeather/releases/latest/download/TikWeather-Android.apk',
      },
    });
    expect(wrapper.get('[data-action="update"]').attributes('href')).toContain(
      'TikWeather-Android.apk',
    );
    expect(wrapper.get('[data-action="update"]').attributes('target')).toBe('_blank');
    expect(wrapper.get('[data-action="dismiss"]').text()).toBe('Cancel');
    wrapper.unmount();
  });

  it.each([
    [130, 0],
    [-130, 0],
    [0, 130],
    [0, -130],
  ])('dismisses a swipe with offset %s %s', async (x, y) => {
    const wrapper = mount(PwaUpdatePrompt, { props: { locale: 'en' } });
    const dialog = wrapper.get('dialog');
    await pointer(dialog, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 300, button: 0 });
    await pointer(dialog, 'pointerup', { pointerId: 1, clientX: 200 + x, clientY: 300 + y });
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
    expect(wrapper.emitted('update')).toBeUndefined();
    wrapper.unmount();
  });

  it('ignores taps, cancelled gestures and a second pointer', async () => {
    const wrapper = mount(PwaUpdatePrompt, { props: { locale: 'en' } });
    const dialog = wrapper.get('dialog');
    await pointer(dialog, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 300, button: 0 });
    await pointer(dialog, 'pointerup', { pointerId: 1, clientX: 210, clientY: 310 });
    await pointer(dialog, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 300, button: 0 });
    await pointer(dialog, 'pointerup', { pointerId: 2, clientX: 400, clientY: 300 });
    await dialog.trigger('pointercancel');
    await pointer(dialog, 'pointerup', { pointerId: 1, clientX: 400, clientY: 300 });
    expect(wrapper.emitted('dismiss')).toBeUndefined();
    wrapper.unmount();
  });

  it('allows Escape to dismiss the modal', async () => {
    const wrapper = mount(PwaUpdatePrompt, { props: { locale: 'en' } });
    await wrapper.get('dialog').trigger('cancel');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
    wrapper.unmount();
  });
});
