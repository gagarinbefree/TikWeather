<script setup lang="ts">
import { computed } from 'vue';
import type { CurrentWeather } from '@/entities/weather/model/current-weather';
import { conditionLabel, countryLabel, messages, type Locale } from '@/shared/locales';
import { weatherPresentation } from '@/shared/weather';

const props = defineProps<{ readonly weather: CurrentWeather; readonly locale: Locale }>();
const text = computed(() => messages[props.locale]);
const presentation = computed(() =>
  weatherPresentation(props.weather.conditionCode, props.weather.isDay),
);
const number = computed(
  () => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 1, useGrouping: false }),
);
const condition = computed(() =>
  conditionLabel(
    props.weather.conditionCode,
    props.weather.isDay,
    props.locale,
    props.weather.conditionLocale === props.locale ? props.weather.conditionText : '',
  ),
);
const time = computed(() =>
  new Intl.DateTimeFormat(props.locale, {
    timeZone: props.weather.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(props.weather.observedAt),
);
const directions = computed<Readonly<Record<string, string>>>(() => text.value.directions);
const measurements = computed(() => [
  { name: text.value.feelsLike, value: `${number.value.format(props.weather.feelsLike)}°C` },
  { name: text.value.humidity, value: `${number.value.format(props.weather.humidity)}%` },
  {
    name: text.value.wind,
    value:
      `${number.value.format(props.weather.windSpeed)} ${text.value.kilometersPerHour} ${directions.value[props.weather.windDirection] ?? ''}`.trim(),
  },
  { name: text.value.uv, value: number.value.format(props.weather.uv) },
  {
    name: text.value.pressure,
    value: `${number.value.format(props.weather.pressure)} ${text.value.millibars}`,
  },
  {
    name: text.value.visibility,
    value: `${number.value.format(props.weather.visibility)} ${text.value.kilometers}`,
  },
]);
</script>

<template>
  <article
    class="current-weather-card"
    :style="presentation.style"
    :aria-label="text.currentWeather"
  >
    <header class="current-weather-card__header">
      <h2>{{ weather.city }}</h2>
      <p>{{ countryLabel(weather.country, locale) }}</p>
      <p class="current-weather-card__updated">
        {{ text.updated }}
        <time :datetime="new Date(weather.observedAt).toISOString()">{{ time }}</time>
      </p>
    </header>
    <div class="current-weather-card__summary">
      <span
        class="current-weather-card__icon"
        :data-weather-icon="presentation.icon"
        :style="{ maskImage: `url(${JSON.stringify(presentation.iconUrl)})` }"
        aria-hidden="true"
      />
      <p class="current-weather-card__temperature">{{ number.format(weather.temperature) }}°C</p>
      <p class="current-weather-card__condition">{{ condition }}</p>
    </div>
    <dl class="current-weather-card__details">
      <div v-for="measurement in measurements" :key="measurement.name">
        <dt>{{ measurement.name }}</dt>
        <dd>{{ measurement.value }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
@layer custom {
  .current-weather-card {
    inline-size: 100%;
    max-inline-size: 30rem;
    min-block-size: 100%;
    display: flex;
    flex-direction: column;
    color: var(--weather-ink);
    background: var(--card-background);
    border-radius: var(--radius-7);
    overflow: clip;
  }
  .current-weather-card__header {
    padding: clamp(1rem, 3dvh, 1.75rem);
    background: linear-gradient(135deg, var(--card-header-start), var(--card-header-end));
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
  .current-weather-card__updated {
    margin-block-start: var(--spacer-2);
    font-size: 0.85rem;
    color: var(--weather-muted);
  }
  .current-weather-card__summary {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: center;
    padding: var(--spacer);
  }
  .current-weather-card__icon {
    inline-size: clamp(3rem, 10dvh, 6rem);
    block-size: clamp(3rem, 10dvh, 6rem);
    background: var(--card-accent);
    mask: center / contain no-repeat;
  }
  .current-weather-card__temperature {
    font-size: clamp(2.5rem, 8dvh, 4.5rem);
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .current-weather-card__condition {
    margin-block-start: var(--spacer-2);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .current-weather-card__details {
    margin: 0;
    padding: var(--spacer);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(0.75rem, 2dvh, 1.5rem) var(--spacer);
  }
  dt {
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--weather-muted);
  }
  dd {
    margin: 0.25rem 0 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
}
</style>
