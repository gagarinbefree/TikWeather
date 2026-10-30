<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useId, useTemplateRef } from 'vue';
import { createGestureEngine, type GestureEngine, type PointerSample } from 'tikitaki';
import logoUrl from '@assets/branding/app-icon-512.png';
import { messages, type Locale } from '@/shared/locales';
import { sunnyThemeStyle } from '@/shared/themes';

const props = defineProps<{ readonly locale: Locale; readonly updateUrl?: string }>();
const emit = defineEmits<{ update: []; dismiss: [] }>();
const text = computed(() => messages[props.locale]);
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const titleId = useId();
const descriptionId = useId();
let gesture: GestureEngine | null = null;

/**
 * pointerSample. Read the pointer values used by TikiTaki
 *
 * @param event The browser pointer event
 * @returns The pointer identity and position with its event time
 */
function pointerSample(event: PointerEvent): PointerSample {
  return { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
}

/**
 * startSwipe. Track a gesture outside the update controls
 *
 * @param event The pointer press inside the update screen
 */
function startSwipe(event: PointerEvent): void {
  if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button, a')))
    return;
  if (gesture?.pointerDown(pointerSample(event))) dialog.value?.setPointerCapture(event.pointerId);
}

/**
 * moveSwipe. Pass pointer movement to the gesture engine
 *
 * @param event The pointer movement inside the update screen
 */
function moveSwipe(event: PointerEvent): void {
  gesture?.pointerMove(pointerSample(event));
}

/**
 * finishSwipe. Dismiss the update screen after a swipe in any direction
 *
 * @param event The pointer release inside the update screen
 */
function finishSwipe(event: PointerEvent): void {
  const settlement = gesture?.pointerUp(pointerSample(event));
  if (!settlement) return;
  gesture?.finishSettling(settlement);
  if (settlement.direction) emit('dismiss');
}

/**
 * cancelSwipe. Discard a cancelled touch without dismissing the card
 */
function cancelSwipe(): void {
  const pointerId = gesture?.getSnapshot().pointerId;
  if (pointerId == null) return;
  const settlement = gesture?.pointerCancel(pointerId);
  if (settlement) gesture?.finishSettling(settlement);
}

/**
 * keepFocus. Cycle keyboard focus between the two update actions
 *
 * @param event The keyboard event inside the modal
 */
function keepFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const controls = dialog.value?.querySelectorAll<HTMLElement>('.btn');
  const first = controls?.[0];
  const last = controls?.[1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  gesture = createGestureEngine({
    width: window.innerWidth,
    height: window.innerHeight,
    neighbors: { left: true, right: true, up: true, down: true },
  });
  dialog.value?.showModal();
});
onBeforeUnmount(() => {
  gesture?.destroy();
  dialog.value?.close();
});
</script>

<template>
  <dialog
    ref="dialog"
    class="pwa-update"
    :style="sunnyThemeStyle"
    :aria-labelledby="titleId"
    :aria-describedby="descriptionId"
    @cancel.prevent="emit('dismiss')"
    @keydown="keepFocus"
    @pointerdown="startSwipe"
    @pointermove="moveSwipe"
    @pointerup="finishSwipe"
    @pointercancel="cancelSwipe"
    @lostpointercapture="cancelSwipe"
  >
    <div class="pwa-update__frame">
      <article class="pwa-update__card" :style="sunnyThemeStyle">
        <img class="pwa-update__logo" :src="logoUrl" alt="" aria-hidden="true" draggable="false" />
        <header class="pwa-update__header">
          <p class="pwa-update__app-name">{{ text.appName }}</p>
          <h2 :id="titleId">{{ text.updateAvailable }}</h2>
        </header>
        <div class="pwa-update__body">
          <p :id="descriptionId">{{ text.updateDescription }}</p>
        </div>
        <footer class="pwa-update__footer">
          <div class="pwa-update__actions">
            <a
              v-if="updateUrl"
              class="btn btn-lg pwa-update__confirm"
              data-action="update"
              :href="updateUrl"
              target="_blank"
              rel="noopener noreferrer"
              >{{ text.updateNow }}</a
            >
            <button
              v-else
              type="button"
              class="btn btn-lg pwa-update__confirm"
              data-action="update"
              @click="emit('update')"
            >
              {{ text.updateNow }}
            </button>
            <button
              type="button"
              class="btn btn-lg pwa-update__cancel"
              data-action="dismiss"
              @click="emit('dismiss')"
            >
              {{ text.updateCancel }}
            </button>
          </div>
          <p class="pwa-update__hint">{{ text.updateSwipeHint }}</p>
        </footer>
      </article>
    </div>
  </dialog>
</template>

<style scoped>
@layer custom {
  .pwa-update {
    position: fixed;
    inset: 0;
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100dvh;
    max-block-size: none;
    margin: 0;
    padding: 0;
    border: 0;
    font-family: Inter, system-ui, sans-serif;
    color: var(--weather-ink);
    background: var(--weather-page);
    touch-action: pinch-zoom;
    overscroll-behavior: contain;
  }
  .pwa-update__frame {
    inline-size: min(100%, 48dvh);
    min-block-size: 100%;
    margin-inline: auto;
    padding-block: max(var(--spacer), env(safe-area-inset-top))
      max(var(--spacer), env(safe-area-inset-bottom));
    padding-inline: max(var(--spacer), env(safe-area-inset-left))
      max(var(--spacer), env(safe-area-inset-right));
    display: grid;
    background: var(--weather-surface);
  }
  .pwa-update__card {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 100%;
    overflow: clip;
    background: var(--card-background);
    border-radius: var(--radius-7);
  }
  .pwa-update__logo {
    position: absolute;
    z-index: -1;
    inset: 0;
    margin: auto;
    inline-size: 95%;
    block-size: auto;
    opacity: 0.055;
    pointer-events: none;
    user-select: none;
  }
  .pwa-update__header {
    padding: clamp(1rem, 3dvh, 1.75rem);
    background: linear-gradient(135deg, var(--card-header-start), var(--card-header-end));
  }
  .pwa-update__app-name {
    margin-block-end: var(--spacer-2);
    color: var(--card-accent);
    font-weight: 600;
  }
  h2 {
    margin: 0;
    font-size: clamp(1.5rem, 4dvh, 2rem);
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
  }
  .pwa-update__body {
    flex: 1;
    display: grid;
    align-content: center;
    padding: var(--spacer-4);
    text-align: center;
    font-size: clamp(1.1rem, 3dvh, 1.5rem);
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .pwa-update__footer {
    display: grid;
    gap: var(--spacer);
    padding: var(--spacer);
  }
  .pwa-update__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacer-2);
  }
  .pwa-update .btn {
    --btn-color: var(--card-accent);
    --btn-border-color: var(--card-accent);
    --btn-hover-border-color: var(--card-accent);
    --btn-hover-bg: var(--card-header-end);
    --btn-hover-color: var(--card-accent);
    --btn-font-weight: 600;
    --btn-white-space: normal;
    min-block-size: 3rem;
    padding-inline: var(--spacer-2);
    overflow-wrap: anywhere;
  }
  .pwa-update .pwa-update__confirm {
    --btn-bg: var(--card-accent);
    --btn-color: var(--card-on-accent);
  }
  .pwa-update .pwa-update__cancel {
    --btn-bg: var(--card-background);
  }
  .pwa-update__hint {
    color: var(--weather-muted);
    font-size: 0.8rem;
    text-align: center;
  }
}
</style>
