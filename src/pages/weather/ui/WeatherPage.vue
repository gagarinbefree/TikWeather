<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useWeatherGridStore } from '@/entities/weather';
import { messages } from '@/shared/locales';
import { LoadingIndicator } from '@/shared/ui/loading-indicator';

const { grid } = storeToRefs(useWeatherGridStore());
const text = messages.ru;
</script>

<template>
  <main class="weather-page" :aria-label="text.weather">
    <section class="weather-viewport" :data-cell-id="grid[0]?.[0]?.id">
      <h1 class="visually-hidden">{{ text.appName }}</h1>
      <LoadingIndicator :label="text.loadingWeather" />
    </section>
  </main>
</template>
