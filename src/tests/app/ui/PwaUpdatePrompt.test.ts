import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PwaUpdatePrompt from '@/app/ui/PwaUpdatePrompt.vue';

describe('PWA update prompt', () => {
  it('offers a localized update and lets the user defer it', async () => {
    const wrapper = mount(PwaUpdatePrompt, { props: { locale: 'ru' } });
    expect(wrapper.text()).toContain('Доступна новая версия');
    await wrapper.get('button[data-action="update"]').trigger('click');
    await wrapper.get('button[data-action="dismiss"]').trigger('click');
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
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
  });
});
