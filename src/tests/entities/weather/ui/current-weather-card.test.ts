import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { CurrentWeatherCard, getCurrentWeather } from '@/entities/weather';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';

describe('CurrentWeatherCard', () => {
  it('changes wind units with the interface language for saved weather without changing stored values', async () => {
    const weather = await getCurrentWeather({
      locale: 'ru',
      location: { source: 'automatic' },
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
    });
    const wrapper = mount(CurrentWeatherCard, {
      props: { weather, locale: 'ru', cachedAt: weather.observedAt },
    });
    expect(wrapper.text()).toContain('2,5 м/с ЗЮЗ');
    await wrapper.setProps({ locale: 'en' });
    expect(wrapper.text()).toContain('5.6 mph WSW');
    await wrapper.setProps({ locale: 'ru' });
    expect(wrapper.text()).toContain('2,5 м/с ЗЮЗ');
    expect(weather.windSpeed).toBe(9);
    wrapper.unmount();
  });

  it('renders localized measurements without an update time for live weather', async () => {
    const weather = await getCurrentWeather({
      locale: 'en',
      location: { source: 'automatic' },
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
    });
    const wrapper = mount(CurrentWeatherCard, { props: { weather, locale: 'ru' } });
    expect(wrapper.text()).toContain('8,9°C');
    expect(wrapper.get('dt').text()).toBe('Ощущается');
    expect(wrapper.text()).toContain('Пасмурно');
    expect(wrapper.text()).toContain('2,5 м/с ЗЮЗ');
    expect(wrapper.text()).toContain('1021 мбар');
    expect(wrapper.find('.weather-cache-status').exists()).toBe(false);
    const metricIcons = wrapper.findAll('.current-weather-card__metric-icon');
    expect(metricIcons.map((icon) => icon.attributes('data-metric-icon'))).toEqual([
      'temperature_20_regular',
      'weather_humidity_20_regular',
      'weather_squalls_20_regular',
      'weather_sunny_high_20_regular',
      'gauge_20_regular',
      'eye_20_regular',
      'weather_sunny_low_20_regular',
      'weather_sunny_low_20_regular',
    ]);
    for (const icon of metricIcons) {
      expect(icon.attributes('aria-hidden')).toBe('true');
      expect(icon.attributes('style')).toContain('mask-image: url(');
    }
    for (const label of wrapper.findAll('dt')) {
      expect(label.element.firstChild?.textContent?.trim()).toBe(label.text());
      expect(label.element.lastElementChild?.hasAttribute('data-metric-icon')).toBe(true);
    }
    expect(wrapper.find('img').exists()).toBe(false);
    wrapper.unmount();
  });

  it('adds today sun times when the background forecast arrives', async () => {
    const weather = await getCurrentWeather({
      locale: 'ru',
      location: { source: 'automatic' },
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
    });
    const wrapper = mount(CurrentWeatherCard, { props: { weather, locale: 'ru' } });

    expect(wrapper.text()).toContain('Восход');
    expect(wrapper.text()).toContain('Закат');
    await wrapper.setProps({ sunTimes: { sunrise: '07:45', sunset: '17:28' } });
    expect(wrapper.text()).toContain('07:45');
    expect(wrapper.text()).toContain('17:28');
    expect(wrapper.text()).toContain('8,9°C');

    await wrapper.setProps({ sunTimes: { sunrise: null, sunset: null }, locale: 'en' });
    expect(wrapper.text()).toContain('No sunrise');
    expect(wrapper.text()).toContain('No sunset');
    wrapper.unmount();
  });

  it('uses the night icon and never displays a raw provider error or unknown code', async () => {
    const weather = await getCurrentWeather({
      locale: 'en',
      location: { source: 'automatic' },
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          ...currentResponse,
          current: {
            ...currentResponse.current,
            is_day: 0,
            condition: { code: 1000, text: 'Clear' },
          },
        }),
      ),
    });
    const wrapper = mount(CurrentWeatherCard, { props: { weather, locale: 'en' } });
    expect(wrapper.text()).toContain('Clear');
    expect(wrapper.get('[data-weather-icon]').attributes('data-weather-icon')).toBe('WeatherMoon');
    wrapper.unmount();
  });

  it('shows the observation time only for saved weather in the location timezone', async () => {
    const weather = await getCurrentWeather({
      locale: 'ru',
      location: { source: 'automatic' },
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
    });
    const observedAt = Date.UTC(2026, 9, 26, 21, 30);
    const wrapper = mount(CurrentWeatherCard, {
      props: { weather: { ...weather, observedAt }, locale: 'ru', cachedAt: observedAt + 60000 },
    });

    expect(wrapper.get('.current-weather-card__date time').text()).toBe('вторник, 27 окт.');
    expect(wrapper.get('.current-weather-card__date time').attributes('datetime')).toBe(
      new Date(observedAt).toISOString(),
    );
    expect(wrapper.get('.weather-cache-status__updated time').text()).toBe('02:30');
    expect(wrapper.get('.weather-cache-status__updated time').attributes('datetime')).toBe(
      new Date(observedAt).toISOString(),
    );
    expect(wrapper.get('.weather-cache-status__icon').attributes('aria-hidden')).toBe('true');
    await wrapper.get('.weather-cache-status button').trigger('click');
    expect(wrapper.emitted('retry')).toEqual([[]]);
    wrapper.unmount();
  });
});
