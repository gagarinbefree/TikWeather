import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { WeatherPage } from '@/pages/weather';
import { currentWeatherServicesKey } from '@/features/current-weather';
import {
  installBrowserEnvironment,
  type BrowserTestEnvironment,
} from '@/tests/shared/lib/browser-environment';

let environment: BrowserTestEnvironment;
beforeEach(() => {
  environment = installBrowserEnvironment();
});
afterEach(() => {
  environment.restore();
});

describe('WeatherPage', () => {
  it('renders a semantic page and a named loading indicator', async () => {
    const wrapper = mount(WeatherPage, {
      global: {
        plugins: [createPinia()],
        provide: {
          [currentWeatherServicesKey as symbol]: {
            locate: () => new Promise(() => undefined),
            current: vi.fn(),
            now: Date.now,
          },
        },
      },
    });
    await nextTick();

    expect(wrapper.find('main').exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('ZoomWeather');
    expect(wrapper.find('[role="status"]').text()).toContain('Detecting location...');
    expect(wrapper.find('.spinner-border').exists()).toBe(true);
    wrapper.unmount();
  });
});
