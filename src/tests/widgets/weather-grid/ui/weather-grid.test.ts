import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WeatherCell } from '@/entities/weather';
import { WeatherGrid } from '@/widgets/weather-grid';
import {
  installBrowserEnvironment,
  type BrowserTestEnvironment,
} from '@/tests/shared/lib/browser-environment';
import { fixtureGrid } from '@/tests/widgets/weather-grid/fixtures/grid';
import ProbeCell from '@/tests/widgets/weather-grid/fixtures/ProbeCell.vue';

let environment: BrowserTestEnvironment;
const wrappers: { unmount: () => void }[] = [];

beforeEach(() => {
  environment = installBrowserEnvironment();
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  environment.restore();
  document.body.replaceChildren();
});

/**
 * renderGrid
 * @returns A mounted weather grid using the real TikiTaki Vue adapter.
 */
function renderGrid(): ReturnType<typeof mount<typeof WeatherGrid>> {
  const wrapper = mount(WeatherGrid, {
    attachTo: document.body,
    props: { grid: fixtureGrid },
    global: { plugins: [createPinia()], provide: { 'test-context': 'parent' } },
    slots: {
      default: ({ cell }: { readonly cell: WeatherCell }) => h(ProbeCell, { id: cell.id }),
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('WeatherGrid', () => {
  it('mounts only the current cell and valid neighboring cells', async () => {
    const wrapper = renderGrid();
    await nextTick();

    expect(wrapper.findAll('[data-cell-id]')).toHaveLength(3);
    expect(
      wrapper.find('[data-tikitaki-role="current"] [data-cell-id]').attributes('data-cell-id'),
    ).toBe('2026-10-26/current');
    expect(wrapper.find('[data-tikitaki-role="right"]').exists()).toBe(false);
    expect(wrapper.find('[data-tikitaki-role="down"]').exists()).toBe(false);
    expect(wrapper.find('[data-tikitaki-role="up"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get<HTMLElement>('[data-tikitaki-role="up"]').element.inert).toBe(true);
  });

  it('preserves Vue injection and Pinia inside teleported cell components', async () => {
    const wrapper = renderGrid();
    await nextTick();

    expect(wrapper.find('[data-tikitaki-role="current"] [data-probe-context]').text()).toBe(
      'parent 1',
    );
  });

  it('moves horizontally and always opens the first cell on a vertical transition', async () => {
    const wrapper = renderGrid();
    const viewport = wrapper.get('.weather-viewport');
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();
    expect(viewport.attributes('data-column')).toBe('1');

    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();
    expect(viewport.attributes('data-column')).toBe('2');

    await viewport.trigger('keydown', { key: 'ArrowDown' });
    await environment.settle();
    expect(viewport.attributes('data-row')).toBe('1');
    expect(viewport.attributes('data-column')).toBe('0');
    expect(viewport.attributes('data-active-cell')).toBe('2026-10-27/daily');

    await viewport.trigger('keydown', { key: 'ArrowUp' });
    await environment.settle();
    expect(viewport.attributes('data-active-cell')).toBe('2026-10-26/current');
  });

  it('preserves the column on a vertical boundary and blocks horizontal movement in a short row', async () => {
    const wrapper = renderGrid();
    const viewport = wrapper.get('.weather-viewport');
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();
    await viewport.trigger('keydown', { key: 'ArrowUp' });
    await environment.settle();
    expect(viewport.attributes('data-column')).toBe('1');

    await viewport.trigger('keydown', { key: 'ArrowDown' });
    await environment.settle();
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();
    expect(viewport.attributes('data-active-cell')).toBe('2026-10-27/daily');
  });

  it('keeps surviving component state during a navigation round trip', async () => {
    const wrapper = renderGrid();
    await nextTick();
    const button = wrapper.get('[data-tikitaki-role="current"] button');
    await button.trigger('click');
    const viewport = wrapper.get('.weather-viewport');
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();
    await viewport.trigger('keydown', { key: 'ArrowLeft' });
    await environment.settle();

    expect(wrapper.get('[data-tikitaki-role="current"] button').text()).toBe('1');
  });

  it('keeps the selected cell when earlier forecast days arrive', async () => {
    const wrapper = renderGrid();
    const viewport = wrapper.get('.weather-viewport');
    await viewport.trigger('keydown', { key: 'ArrowDown' });
    await environment.settle();
    await viewport.trigger('keydown', { key: 'ArrowDown' });
    await environment.settle();
    expect(viewport.attributes('data-active-cell')).toBe('2026-10-28/daily');

    await wrapper.setProps({ grid: [fixtureGrid[0] ?? [], fixtureGrid[2] ?? []] });
    await environment.settle();
    expect(viewport.attributes('data-active-cell')).toBe('2026-10-28/daily');
    expect(viewport.attributes('data-row')).toBe('1');

    await wrapper.setProps({ grid: fixtureGrid });
    await environment.settle();
    expect(viewport.attributes('data-active-cell')).toBe('2026-10-28/daily');
    expect(viewport.attributes('data-row')).toBe('2');
  });

  it('selects a valid cell if the selected forecast is removed', async () => {
    const wrapper = renderGrid();
    const viewport = wrapper.get('.weather-viewport');
    await viewport.trigger('keydown', { key: 'ArrowDown' });
    await environment.settle();
    await wrapper.setProps({ grid: [fixtureGrid[0] ?? []] });
    await environment.settle();

    expect(viewport.attributes('data-active-cell')).toBe('2026-10-26/current');
  });

  it('does not take arrow keys from controls inside a card', async () => {
    const wrapper = renderGrid();
    await nextTick();
    await wrapper
      .get('[data-tikitaki-role="current"] button')
      .trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();

    expect(wrapper.get('.weather-viewport').attributes('data-column')).toBe('0');
  });

  it('does not queue rapid keyboard commands during an active transition', async () => {
    const wrapper = renderGrid();
    const viewport = wrapper.get('.weather-viewport');
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await viewport.trigger('keydown', { key: 'ArrowRight' });
    await environment.settle();

    expect(viewport.attributes('data-column')).toBe('1');
  });

  it('releases observers and pending frames on unmount and can mount again', async () => {
    const wrapper = renderGrid();
    await wrapper.get('.weather-viewport').trigger('keydown', { key: 'ArrowRight' });
    wrapper.unmount();
    await environment.settle();
    expect(environment.observers.size).toBe(0);
    expect(environment.frames.size).toBe(0);

    const second = renderGrid();
    await second.get('.weather-viewport').trigger('keydown', { key: 'ArrowDown' });
    await environment.settle();
    expect(environment.observers.size).toBe(1);
    expect(second.get('.weather-viewport').attributes('data-active-cell')).toBe('2026-10-27/daily');
  });

  it('reports invalid grids through a localized error and releases the engine', async () => {
    const wrapper = renderGrid();
    await wrapper.setProps({ grid: [] });
    await environment.settle();

    expect(wrapper.get('[role="alert"]').text()).toBe('Не удалось открыть прогноз');
    expect(wrapper.emitted('error')).toHaveLength(1);
    expect(environment.observers.size).toBe(0);
    expect(wrapper.find('[data-tikitaki-engine]').exists()).toBe(false);
  });
});
