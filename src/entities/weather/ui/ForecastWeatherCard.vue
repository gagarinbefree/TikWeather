<script setup lang="ts">
import { computed } from 'vue';
import type { ForecastDay, ForecastHour } from '@/entities/weather/model/forecast';
import humidityIcon from '@/shared/assets/icons/weather_humidity_20_regular.svg?url';
import windIcon from '@/shared/assets/icons/weather_squalls_20_regular.svg?url';
import rainIcon from '@/shared/assets/icons/drop_20_regular.svg?url';
import uvIcon from '@/shared/assets/icons/weather_sunny_high_20_regular.svg?url';
import clockIcon from '@/shared/assets/icons/clock_20_regular.svg?url';
import temperatureIcon from '@/shared/assets/icons/temperature_20_regular.svg?url';
import visibilityIcon from '@/shared/assets/icons/eye_20_regular.svg?url';
import { conditionLabel, messages, type Locale } from '@/shared/locales';
import { weatherPresentation } from '@/shared/weather';

const props = defineProps<{
  readonly forecast: ForecastDay | ForecastHour;
  readonly kind: 'daily' | 'hourly';
  readonly dayIndex: number;
  readonly city: string;
  readonly timeZone: string;
  readonly locale: Locale;
}>();

const text = computed(() => messages[props.locale]);
const number = computed(
  () => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 1, useGrouping: false }),
);
const directions = computed<Readonly<Record<string, string>>>(() => text.value.directions);
const daily = computed(() => ('date' in props.forecast ? props.forecast : null));
const hourly = computed(() => ('timestamp' in props.forecast ? props.forecast : null));
const presentation = computed(() =>
  weatherPresentation(props.forecast.conditionCode, hourly.value?.isDay ?? true),
);
const condition = computed(() =>
  conditionLabel(
    props.forecast.conditionCode,
    hourly.value?.isDay ?? true,
    props.locale,
    props.forecast.conditionLocale === props.locale ? props.forecast.conditionText : '',
  ),
);
const dayDate = computed(() => new Date(`${daily.value?.date ?? '1970-01-01'}T12:00:00Z`));
const title = computed(() => {
  if (hourly.value)
    return new Intl.DateTimeFormat(props.locale, {
      timeZone: props.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(hourly.value.timestamp);
  if (props.dayIndex === 0) return text.value.today;
  if (props.dayIndex === 1) return text.value.tomorrow;
  const weekday = new Intl.DateTimeFormat(props.locale, {
    timeZone: 'UTC',
    weekday: 'long',
  }).format(dayDate.value);
  return weekday.charAt(0).toLocaleUpperCase(props.locale) + weekday.slice(1);
});
const dateLabel = computed(() => {
  if (hourly.value)
    return new Intl.DateTimeFormat(props.locale, {
      timeZone: props.timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(hourly.value.timestamp);
  return new Intl.DateTimeFormat(props.locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dayDate.value);
});
const measurements = computed(() => {
  const day = daily.value;
  if (day)
    return [
      {
        name: text.value.humidity,
        value: `${number.value.format(day.humidity)}%`,
        icon: humidityIcon,
      },
      {
        name: text.value.wind,
        value: `${number.value.format(day.windSpeed)} ${text.value.kilometersPerHour}`,
        icon: windIcon,
      },
      {
        name: text.value.rainChance,
        value: `${number.value.format(day.rainChance)}%`,
        icon: rainIcon,
      },
      { name: text.value.uv, value: number.value.format(day.uv), icon: uvIcon },
      { name: text.value.sunrise, value: day.sunrise ?? text.value.noSunrise, icon: clockIcon },
      { name: text.value.sunset, value: day.sunset ?? text.value.noSunset, icon: clockIcon },
    ];
  const hour = hourly.value;
  if (!hour) return [];
  return [
    {
      name: text.value.feelsLike,
      value: `${number.value.format(hour.feelsLike)}°C`,
      icon: temperatureIcon,
    },
    {
      name: text.value.humidity,
      value: `${number.value.format(hour.humidity)}%`,
      icon: humidityIcon,
    },
    {
      name: text.value.wind,
      value:
        `${number.value.format(hour.windSpeed)} ${text.value.kilometersPerHour} ${directions.value[hour.windDirection] ?? ''}`.trim(),
      icon: windIcon,
    },
    {
      name: text.value.rainChance,
      value: `${number.value.format(hour.rainChance)}%`,
      icon: rainIcon,
    },
    { name: text.value.uv, value: number.value.format(hour.uv), icon: uvIcon },
    {
      name: text.value.visibility,
      value: `${number.value.format(hour.visibility)} ${text.value.kilometers}`,
      icon: visibilityIcon,
    },
  ];
});
</script>

<template>
  <article
    class="forecast-weather-card"
    :style="presentation.style"
    :aria-label="kind === 'daily' ? text.dailyForecast : text.hourlyForecast"
  >
    <header class="forecast-weather-card__header">
      <h2>{{ title }}</h2>
      <p>{{ city }}</p>
      <p class="forecast-weather-card__date">
        <time v-if="hourly" :datetime="new Date(hourly.timestamp).toISOString()">
          {{ dateLabel }}
        </time>
        <time v-else-if="daily" :datetime="daily.date">{{ dateLabel }}</time>
      </p>
    </header>
    <div class="forecast-weather-card__summary">
      <span
        class="forecast-weather-card__icon"
        :data-weather-icon="presentation.icon"
        :style="{ maskImage: `url(${JSON.stringify(presentation.iconUrl)})` }"
        aria-hidden="true"
      />
      <p class="forecast-weather-card__temperature">
        {{ number.format(daily?.maximum ?? hourly?.temperature ?? 0) }}°C
      </p>
      <p v-if="daily" class="forecast-weather-card__minimum">
        {{ text.minimum }} {{ number.format(daily.minimum) }}°C
      </p>
      <p class="forecast-weather-card__condition">{{ condition }}</p>
    </div>
    <dl class="forecast-weather-card__details">
      <div v-for="measurement in measurements" :key="measurement.name">
        <dt>
          <span
            class="forecast-weather-card__metric-icon"
            data-metric-icon
            :style="{ maskImage: `url(${JSON.stringify(measurement.icon)})` }"
            aria-hidden="true"
          />
          {{ measurement.name }}
        </dt>
        <dd>{{ measurement.value }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
@layer custom {
  .forecast-weather-card {
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
  .forecast-weather-card__header {
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
  .forecast-weather-card__date {
    margin-block-start: var(--spacer-2);
    font-size: 0.85rem;
    color: var(--weather-muted);
  }
  .forecast-weather-card__summary {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: center;
    padding: var(--spacer);
  }
  .forecast-weather-card__icon {
    inline-size: clamp(3rem, 10dvh, 6rem);
    block-size: clamp(3rem, 10dvh, 6rem);
    background: var(--card-accent);
    mask: center / contain no-repeat;
  }
  .forecast-weather-card__temperature {
    font-size: clamp(2.5rem, 8dvh, 4.5rem);
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .forecast-weather-card__minimum {
    color: var(--weather-muted);
  }
  .forecast-weather-card__condition {
    margin-block-start: var(--spacer-2);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .forecast-weather-card__details {
    margin: 0;
    padding: var(--spacer);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(0.75rem, 2dvh, 1.5rem) var(--spacer);
  }
  dt {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--weather-muted);
  }
  .forecast-weather-card__metric-icon {
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
