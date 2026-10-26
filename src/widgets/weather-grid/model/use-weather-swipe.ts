import { onBeforeUnmount, onMounted, shallowRef, watch, type ShallowRef } from 'vue';
import type { Direction, Position } from 'tikitaki';
import { createSwipeEngine, type SwipeEngine } from 'tikitaki/dom';
import { createVueCellAdapter, type VueCellBridge } from '@tikitaki_gagarinbefree/vue';
import type { WeatherCell, WeatherGrid } from '@/entities/weather';
import { messages } from '@/shared/locales';

interface WeatherSwipeView {
  readonly cells: VueCellBridge<WeatherCell>['cells'];
  readonly position: Readonly<ShallowRef<Position>>;
  readonly failed: Readonly<ShallowRef<boolean>>;
  readonly onKeydown: (event: KeyboardEvent) => void;
}

const keyboardDirections: Readonly<Record<string, Direction>> = {
  ArrowRight: 'left',
  ArrowLeft: 'right',
  ArrowDown: 'up',
  ArrowUp: 'down',
};

/**
 * findCellPosition
 * @param grid The next available forecast grid.
 * @param id The identity of the selected forecast cell.
 * @returns The new coordinates of the same forecast cell when it is still available.
 */
function findCellPosition(grid: WeatherGrid, id: string | null): Position | undefined {
  for (const [row, cells] of grid.entries()) {
    const col = cells.findIndex((cell) => cell.id === id);
    if (col !== -1) return { row, col };
  }
  return undefined;
}

/**
 * useWeatherSwipe
 * @param container The Vue reference to the engine viewport.
 * @param readGrid The current immutable forecast snapshot.
 * @param onPositionChange The callback for a committed selection.
 * @param onError The callback for a controller failure.
 * @returns Reactive cell hosts and navigation state owned by the current Vue component.
 */
export function useWeatherSwipe(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  readGrid: () => WeatherGrid,
  onPositionChange: (position: Position) => void,
  onError: (error: Error) => void,
): WeatherSwipeView {
  const bridge = createVueCellAdapter<WeatherCell>();
  const controller = shallowRef<SwipeEngine<WeatherCell> | null>(null);
  const position = shallowRef<Position>({ row: 0, col: 0 });
  const failed = shallowRef(false);
  let selectedId: string | null = null;
  let revision = 0;
  let updating = false;
  let disposed = false;

  /**
   * stop
   */
  function stop(): void {
    revision++;
    controller.value?.destroy();
    controller.value = null;
  }

  /**
   * reportError
   * @param error The failure reported by the controller or a navigation promise.
   */
  function reportError(error: unknown): void {
    if (disposed || failed.value) return;
    stop();
    failed.value = true;
    onError(error instanceof Error ? error : new Error(messages.en.navigationFailed));
  }

  /**
   * publishPosition
   * @param next The coordinates committed by TikiTaki.
   */
  function publishPosition(next: Position): void {
    if (disposed || updating) return;
    position.value = next;
    selectedId = readGrid()[next.row]?.[next.col]?.id ?? null;
    onPositionChange(next);
  }

  /**
   * updateGrid
   * @param grid The next forecast snapshot.
   * @returns A promise that resolves after the selected cell is reconciled.
   */
  async function updateGrid(grid: WeatherGrid): Promise<void> {
    const engine = controller.value;
    if (!engine) return;
    const token = ++revision;
    const target = findCellPosition(grid, selectedId);
    updating = true;
    try {
      engine.updateGrid(grid);
      if (target) await engine.goTo(target);
      if (disposed || token !== revision) return;
      updating = false;
      publishPosition(engine.getPosition());
    } catch (error) {
      if (!disposed && token === revision) reportError(error);
    } finally {
      if (token === revision) updating = false;
    }
  }

  /**
   * onKeydown
   * @param event The keyboard event originating from the viewport itself.
   */
  function onKeydown(event: KeyboardEvent): void {
    if (
      event.target !== event.currentTarget ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const direction = keyboardDirections[event.key];
    if (!direction || !controller.value) return;
    event.preventDefault();
    void controller.value.navigate(direction).catch(reportError);
  }

  onMounted(() => {
    if (!container.value) return;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      controller.value = createSwipeEngine({
        container: container.value,
        grid: readGrid(),
        adapter: bridge.adapter,
        onPositionChange: publishPosition,
        onError: reportError,
        ...(reduceMotion ? { gesture: { animationDuration: 0 } } : {}),
      });
      publishPosition(controller.value.getPosition());
    } catch (error) {
      reportError(error);
    }
  });

  watch(readGrid, updateGrid, { flush: 'post' });
  onBeforeUnmount(() => {
    disposed = true;
    stop();
  });
  return { cells: bridge.cells, position, failed, onKeydown };
}
