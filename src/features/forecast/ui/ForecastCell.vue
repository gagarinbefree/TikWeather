<script setup lang="ts">
import { computed } from 'vue';
import {
  ForecastWeatherCard,
  type DailyWeatherCell,
  type HourlyWeatherCell,
} from '@/entities/weather';
import { useForecastStore } from '@/features/forecast/model/forecast-store';
import { messages, type Locale } from '@/shared/locales';
import { LoadingIndicator } from '@/shared/ui/loading-indicator';

const props = defineProps<{
  readonly cell: DailyWeatherCell | HourlyWeatherCell;
  readonly dayIndex: number;
  readonly city: string;
  readonly timeZone: string;
  readonly locale: Locale;
  readonly cachedAt?: number | null;
}>();

const forecast = useForecastStore();
const text = computed(() => messages[props.locale]);
const data = computed(() =>
  props.cell.kind === 'daily'
    ? forecast.day(props.cell.date)
    : forecast.hour(props.cell.date, props.cell.timestamp),
);
const failure = computed(
  () => forecast.failure ?? (forecast.day(props.cell.date) && !data.value ? 'unavailable' : null),
);
</script>

<template>
  <ForecastWeatherCard
    v-if="data"
    :forecast="data"
    :kind="cell.kind"
    :day-index="dayIndex"
    :city="city"
    :time-zone="timeZone"
    :locale="locale"
    :cached-at="cachedAt"
  />
  <section v-else-if="failure" class="forecast-error">
    <p role="alert">{{ text.failures[failure] }}</p>
    <button type="button" class="btn" @click="forecast.retry">{{ text.retry }}</button>
  </section>
  <LoadingIndicator v-else :label="text.loadingWeather" />
</template>

<style scoped>
@layer custom {
  .forecast-error {
    display: grid;
    gap: var(--spacer);
    justify-items: start;
    inline-size: 100%;
    padding: var(--spacer-4);
    background: var(--weather-error-background);
    border-radius: var(--radius-5);
  }
  .forecast-error p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .forecast-error .btn {
    --btn-bg: var(--weather-surface);
    --btn-color: var(--weather-ink);
    --btn-border-color: var(--weather-muted);
    --btn-hover-bg: var(--weather-page);
    white-space: normal;
  }
}
</style>
