<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, inject, onBeforeUnmount, onMounted, watch } from 'vue';
import { CurrentWeatherCard, useWeatherGridStore } from '@/entities/weather';
import { currentWeatherServicesKey, useCurrentWeatherStore } from '@/features/current-weather';
import { messages } from '@/shared/locales';
import { LoadingIndicator } from '@/shared/ui/loading-indicator';
import { baseThemeStyle } from '@/shared/themes';
import { WeatherGrid } from '@/widgets/weather-grid';

const { grid } = storeToRefs(useWeatherGridStore());
const weather = useCurrentWeatherStore();
const services = inject(currentWeatherServicesKey, null);
const { state, locale } = storeToRefs(weather);
const text = computed(() => messages[locale.value]);

/**
 * retry
 */
function retry(): void {
  if (services) void weather.load(services);
}
onMounted(retry);
onBeforeUnmount(weather.cancel);
watch(
  locale,
  (language) => {
    document.documentElement.lang = language;
  },
  { immediate: true },
);
</script>

<template>
  <main class="weather-page" :style="baseThemeStyle" :aria-label="text.weather">
    <h1 class="visually-hidden">{{ text.appName }}</h1>
    <WeatherGrid :grid="grid" :locale="locale">
      <template #default="{ cell }">
        <CurrentWeatherCard
          v-if="cell.kind === 'current' && state.status === 'ready'"
          :weather="state.weather"
          :locale="locale"
        />
        <section
          v-else-if="cell.kind === 'current' && state.status === 'error'"
          class="weather-error"
        >
          <p role="alert">{{ text.failures[state.failure] }}</p>
          <button type="button" class="btn" @click="retry">{{ text.retry }}</button>
        </section>
        <LoadingIndicator
          v-else
          :label="
            state.status === 'loading' && state.phase === 'location'
              ? text.locating
              : text.loadingWeather
          "
        />
      </template>
    </WeatherGrid>
  </main>
</template>

<style scoped>
@layer custom {
  .weather-error {
    display: grid;
    gap: var(--spacer);
    justify-items: start;
    inline-size: 100%;
    padding: var(--spacer-4);
    background: var(--weather-error-background);
    border-radius: var(--radius-5);
  }
  .weather-error p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .weather-error .btn {
    --btn-bg: var(--weather-surface);
    --btn-color: var(--weather-ink);
    --btn-border-color: var(--weather-muted);
    --btn-hover-bg: var(--weather-page);
    white-space: normal;
  }
}
</style>
