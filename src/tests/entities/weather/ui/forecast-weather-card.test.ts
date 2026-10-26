import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ForecastWeatherCard, getForecast } from '@/entities/weather';
import { forecastResponse } from '@/tests/entities/weather/api/forecast-fixture';

describe('ForecastWeatherCard', () => {
  it('shows a localized tomorrow card with daily measurements and astronomy', async () => {
    const forecast = await getForecast({
      apiKey: 'example-only',
      location: { source: 'automatic' },
      locale: 'ru',
      timeZone: 'Asia/Yekaterinburg',
      days: 3,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json(forecastResponse)),
    });
    const day = forecast.days[1];
    if (!day) throw new Error('Expected tomorrow forecast');
    const wrapper = mount(ForecastWeatherCard, {
      props: {
        forecast: day,
        kind: 'daily',
        dayIndex: 1,
        city: 'Пермь',
        timeZone: 'Asia/Yekaterinburg',
        locale: 'ru',
      },
    });
    expect(wrapper.get('h2').text()).toBe('Завтра');
    expect(wrapper.text()).toContain('10°C');
    expect(wrapper.text()).toContain('5°C');
    expect(wrapper.text()).toContain('Пасмурно');
    expect(wrapper.text()).toContain('07:47');
    expect(wrapper.text()).toContain('17:26');
    expect(wrapper.findAll('[data-metric-icon]')).toHaveLength(6);
    wrapper.unmount();
  });

  it('shows an hourly forecast at its location time with rain chance', async () => {
    const forecast = await getForecast({
      apiKey: 'example-only',
      location: { source: 'automatic' },
      locale: 'en',
      timeZone: 'Asia/Yekaterinburg',
      days: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          forecast: { forecastday: forecastResponse.forecast.forecastday.slice(0, 1) },
        }),
      ),
    });
    const hour = forecast.days[0]?.hours[0];
    if (!hour) throw new Error('Expected hourly forecast');
    const wrapper = mount(ForecastWeatherCard, {
      props: {
        forecast: hour,
        kind: 'hourly',
        dayIndex: 0,
        city: 'Perm',
        timeZone: 'Asia/Yekaterinburg',
        locale: 'en',
      },
    });
    expect(wrapper.get('h2').text()).toBe('12:00');
    expect(wrapper.text()).toContain('9.5°C');
    expect(wrapper.text()).toContain('35%');
    expect(wrapper.get('time').attributes('datetime')).toBe(new Date(hour.timestamp).toISOString());
    wrapper.unmount();
  });
});
