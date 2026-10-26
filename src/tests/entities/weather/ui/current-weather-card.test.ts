import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { CurrentWeatherCard, getCurrentWeather } from '@/entities/weather';
import { currentResponse } from '@/tests/entities/weather/api/current-fixture';

describe('CurrentWeatherCard', () => {
  it('renders localized measurements and the observation time in the location timezone', async () => {
    const weather = await getCurrentWeather({
      apiKey: 'example-only',
      locale: 'en',
      location: { source: 'automatic' },
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(currentResponse)),
    });
    const wrapper = mount(CurrentWeatherCard, { props: { weather, locale: 'ru' } });
    expect(wrapper.text()).toContain('8,9°C');
    expect(wrapper.text()).toContain('Ощущается как');
    expect(wrapper.text()).toContain('Пасмурно');
    expect(wrapper.text()).toContain('9 км/ч ЗЮЗ');
    expect(wrapper.text()).toContain('1021 мбар');
    expect(wrapper.get('time').attributes('datetime')).toBe(
      new Date(weather.observedAt).toISOString(),
    );
    expect(wrapper.get('time').text()).toBe(
      new Intl.DateTimeFormat('ru', {
        timeZone: weather.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(weather.observedAt),
    );
    const metricIcons = wrapper.findAll('.current-weather-card__metric-icon');
    expect(metricIcons.map((icon) => icon.attributes('data-metric-icon'))).toEqual([
      'temperature_20_regular',
      'weather_humidity_20_regular',
      'weather_squalls_20_regular',
      'weather_sunny_high_20_regular',
      'gauge_20_regular',
      'eye_20_regular',
    ]);
    for (const icon of metricIcons) {
      expect(icon.attributes('aria-hidden')).toBe('true');
      expect(icon.attributes('style')).toContain('mask-image: url(');
    }
    expect(wrapper.find('img').exists()).toBe(false);
    wrapper.unmount();
  });

  it('uses the night icon and never displays a raw provider error or unknown code', async () => {
    const weather = await getCurrentWeather({
      apiKey: 'example-only',
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
});
