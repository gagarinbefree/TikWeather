import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import WeatherCacheStatus from '@/entities/weather/ui/WeatherCacheStatus.vue';

describe('WeatherCacheStatus', () => {
  const cachedAt = Date.UTC(2026, 9, 26, 21, 31);
  const observedAt = cachedAt - 60_000;

  it('labels the saved forecast and formats both times in the location timezone', async () => {
    const wrapper = mount(WeatherCacheStatus, {
      props: { cachedAt, observedAt, locale: 'ru', timeZone: 'Asia/Yekaterinburg' },
    });

    expect(wrapper.get('summary').attributes('aria-label')).toBe(
      'Сохранённый прогноз от 27 окт., 02:31',
    );
    expect(wrapper.get('time').attributes('datetime')).toBe(new Date(cachedAt).toISOString());
    expect(wrapper.get('.weather-cache-status__updated').text()).toBe('Обновлено 02:30');
    expect(wrapper.find('button').exists()).toBe(false);

    await wrapper.setProps({ locale: 'en', timeZone: 'UTC' });
    expect(wrapper.get('summary').attributes('aria-label')).toBe(
      'Saved forecast from Oct 26, 21:31',
    );
    expect(wrapper.get('.weather-cache-status__updated').text()).toBe('Updated 21:30');
    wrapper.unmount();
  });

  it('closes the details on Escape and retry without losing keyboard focus', async () => {
    const wrapper = mount(WeatherCacheStatus, {
      props: { cachedAt, locale: 'en', timeZone: 'UTC', retryable: true },
      attachTo: document.body,
    });
    const details = wrapper.get('details').element as HTMLDetailsElement;
    const summary = wrapper.get('summary');
    expect(wrapper.find('.weather-cache-status__updated').exists()).toBe(false);

    details.open = true;
    await summary.trigger('keydown', { key: 'Escape' });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary.element);

    details.open = true;
    await wrapper.get('button').trigger('click');
    expect(details.open).toBe(false);
    expect(wrapper.emitted('retry')).toEqual([[]]);
    wrapper.unmount();
  });
});
