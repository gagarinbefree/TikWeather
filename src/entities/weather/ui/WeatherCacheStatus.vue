<script setup lang="ts">
import { computed, ref } from 'vue';
import clockIcon from '@assets/icons/clock_20_regular.svg?url';
import { messages, type Locale } from '@/shared/locales';

const props = defineProps<{
  readonly cachedAt: number;
  readonly observedAt?: number;
  readonly timeZone: string;
  readonly locale: Locale;
  readonly retryable?: boolean;
}>();
const emit = defineEmits<{ retry: [] }>();
const disclosure = ref<HTMLDetailsElement | null>(null);
const text = computed(() => messages[props.locale]);
const savedTime = computed(() =>
  new Intl.DateTimeFormat(props.locale, {
    timeZone: props.timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(props.cachedAt),
);
const observedTime = computed(() =>
  props.observedAt === undefined
    ? ''
    : new Intl.DateTimeFormat(props.locale, {
        timeZone: props.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(props.observedAt),
);

/**
 * closeStatus. Close the saved forecast details and focus their toggle
 */
function closeStatus(): void {
  if (!disclosure.value?.open) return;
  disclosure.value.open = false;
  disclosure.value.querySelector('summary')?.focus();
}

/**
 * retry. Close the saved forecast details and request fresh weather
 */
function retry(): void {
  closeStatus();
  emit('retry');
}
</script>

<template>
  <details
    ref="disclosure"
    class="weather-cache-status"
    @pointerdown.stop
    @keydown.esc.prevent.stop="closeStatus"
  >
    <summary :aria-label="`${text.savedForecast} ${savedTime}`">
      <span
        class="weather-cache-status__icon"
        :style="{ maskImage: `url(${JSON.stringify(clockIcon)})` }"
        aria-hidden="true"
      />
    </summary>
    <div class="weather-cache-status__panel" role="status">
      <p>
        {{ text.savedForecast }}
        <time :datetime="new Date(cachedAt).toISOString()">{{ savedTime }}</time>
      </p>
      <p v-if="observedAt !== undefined" class="weather-cache-status__updated">
        {{ text.updated }}
        <time :datetime="new Date(observedAt).toISOString()">{{ observedTime }}</time>
      </p>
      <button v-if="retryable" type="button" class="btn" @click="retry">
        {{ text.retry }}
      </button>
    </div>
  </details>
</template>

<style scoped>
@layer custom {
  .weather-cache-status {
    position: absolute;
    inset-inline: clamp(1rem, 3dvh, 1.75rem);
    inset-block-start: clamp(1rem, 3dvh, 1.75rem);
    z-index: 2;
    pointer-events: none;
  }
  summary {
    position: relative;
    display: block;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    margin-inline-start: auto;
    color: var(--weather-muted);
    border-radius: var(--radius-pill);
    cursor: pointer;
    list-style: none;
    pointer-events: auto;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover,
  details[open] summary {
    background: var(--weather-surface);
  }
  summary:focus-visible {
    outline: var(--focus-ring-width) solid var(--weather-ink);
    outline-offset: var(--spacer-1);
  }
  .weather-cache-status__icon {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    transform: translate(-50%, -50%);
    display: block;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    background: currentColor;
    mask: center / contain no-repeat;
  }
  .weather-cache-status__panel {
    position: absolute;
    inset-inline-end: 0;
    inset-block-start: calc(100% + var(--spacer-1));
    inline-size: 18rem;
    max-inline-size: 100%;
    display: grid;
    justify-items: start;
    gap: var(--spacer-2);
    padding: var(--spacer-3);
    color: var(--weather-ink);
    background: var(--weather-surface);
    border: var(--border-width) solid var(--weather-muted);
    border-radius: var(--radius-4);
    box-shadow: 0 var(--spacer-1) var(--spacer-3)
      color-mix(in srgb, var(--weather-ink) 16%, transparent);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
    pointer-events: auto;
  }
  p {
    margin: 0;
  }
  .weather-cache-status__updated {
    color: var(--weather-muted);
  }
  .btn {
    --btn-bg: var(--weather-surface);
    --btn-color: var(--weather-ink);
    --btn-border-color: var(--weather-muted);
    --btn-hover-bg: var(--weather-page);
    white-space: normal;
  }
}
</style>
