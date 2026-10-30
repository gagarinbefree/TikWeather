<script setup lang="ts">
import { computed } from 'vue';
import type { CurrentWeather } from '@/entities/weather/model/current-weather';
import type { ForecastDay } from '@/entities/weather/model/forecast';
import temperatureIcon from '@assets/icons/temperature_20_regular.svg?url';
import humidityIcon from '@assets/icons/weather_humidity_20_regular.svg?url';
import windIcon from '@assets/icons/weather_squalls_20_regular.svg?url';
import uvIcon from '@assets/icons/weather_sunny_high_20_regular.svg?url';
import pressureIcon from '@assets/icons/gauge_20_regular.svg?url';
import visibilityIcon from '@assets/icons/eye_20_regular.svg?url';
import clockIcon from '@assets/icons/clock_20_regular.svg?url';
import { conditionLabel, countryLabel, messages, type Locale } from '@/shared/locales';
import { formatWindSpeed, weatherPresentation } from '@/shared/weather';
import WeatherCacheStatus from './WeatherCacheStatus.vue';

const props = defineProps<{
  readonly weather: CurrentWeather;
  readonly locale: Locale;
  readonly cachedAt?: number | null;
  readonly sunTimes?: Pick<ForecastDay, 'sunrise' | 'sunset'> | undefined;
}>();
const emit = defineEmits<{ retry: [] }>();
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
const dateLabel = computed(() =>
  new Intl.DateTimeFormat(props.locale, {
    timeZone: props.weather.timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(props.weather.observedAt),
);
const measurements = computed(() => [
  {
    name: text.value.feelsLike,
    value: `${number.value.format(props.weather.feelsLike)}°C`,
    icon: 'temperature_20_regular',
    iconUrl: temperatureIcon,
  },
  {
    name: text.value.humidity,
    value: `${number.value.format(props.weather.humidity)}%`,
    icon: 'weather_humidity_20_regular',
    iconUrl: humidityIcon,
  },
  {
    name: text.value.wind,
    value: formatWindSpeed(props.weather.windSpeed, props.locale, props.weather.windDirection),
    icon: 'weather_squalls_20_regular',
    iconUrl: windIcon,
  },
  {
    name: text.value.uv,
    value: props.weather.uv === null ? text.value.noData : number.value.format(props.weather.uv),
    icon: 'weather_sunny_high_20_regular',
    iconUrl: uvIcon,
  },
  {
    name: text.value.pressure,
    value: `${number.value.format(props.weather.pressure)} ${text.value.millibars}`,
    icon: 'gauge_20_regular',
    iconUrl: pressureIcon,
  },
  {
    name: text.value.visibility,
    value:
      props.weather.visibility === null
        ? text.value.noData
        : `${number.value.format(props.weather.visibility)} ${text.value.kilometers}`,
    icon: 'eye_20_regular',
    iconUrl: visibilityIcon,
  },
  {
    name: text.value.sunrise,
    value:
      props.sunTimes?.sunrise === undefined
        ? text.value.noData
        : (props.sunTimes.sunrise ?? text.value.noSunrise),
    icon: 'clock_20_regular',
    iconUrl: clockIcon,
  },
  {
    name: text.value.sunset,
    value:
      props.sunTimes?.sunset === undefined
        ? text.value.noData
        : (props.sunTimes.sunset ?? text.value.noSunset),
    icon: 'clock_20_regular',
    iconUrl: clockIcon,
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
      <p class="current-weather-card__date">
        <time :datetime="new Date(weather.observedAt).toISOString()">{{ dateLabel }}</time>
      </p>
      <WeatherCacheStatus
        v-if="cachedAt != null"
        :cached-at="cachedAt"
        :observed-at="weather.observedAt"
        :time-zone="weather.timeZone"
        :locale="locale"
        retryable
        @retry="emit('retry')"
      />
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
        <dt>
          {{ measurement.name }}
          <span
            class="current-weather-card__metric-icon"
            :data-metric-icon="measurement.icon"
            :style="{ maskImage: `url(${JSON.stringify(measurement.iconUrl)})` }"
            aria-hidden="true"
          />
        </dt>
        <dd>{{ measurement.value }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped lang="scss">
@use '@assets/styles/weather-card-layout' as layout;

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
    position: relative;
    padding: clamp(1rem, 3dvh, 1.75rem);
    background: linear-gradient(135deg, var(--card-header-start), var(--card-header-end));
  }
  h2 {
    margin: 0;
    padding-inline-end: 3rem;
    font-size: clamp(1.5rem, 4dvh, 2rem);
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
  }
  .current-weather-card__date {
    margin-block-start: var(--spacer-2);
    font-size: 0.85rem;
    color: var(--weather-muted);
  }
  .current-weather-card__summary {
    @include layout.summary;
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
    font-weight: 700;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .current-weather-card__condition {
    grid-row: 4;
    margin-block-start: var(--spacer-2);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .current-weather-card__details {
    @include layout.details;
  }
  dt {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--weather-muted);
  }
  .current-weather-card__metric-icon {
    flex: none;
    inline-size: 0.875rem;
    block-size: 0.875rem;
    background: currentColor;
    mask: center / contain no-repeat;
  }
  dd {
    margin: 0.25rem 0 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
}
</style>
