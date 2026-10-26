import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { WeatherPage } from '@/pages/weather';

describe('WeatherPage', () => {
  it('renders a semantic page and a named loading indicator', () => {
    const wrapper = mount(WeatherPage, { global: { plugins: [createPinia()] } });

    expect(wrapper.find('main').exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('TikWeather');
    expect(wrapper.find('[role="status"]').text()).toContain('Загрузка погоды');
    expect(wrapper.find('.spinner-border').exists()).toBe(true);
  });
});
