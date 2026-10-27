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
});
