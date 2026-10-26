<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useWeatherGridStore } from '@/entities/weather';
import { messages } from '@/shared/locales';
import { WeatherGrid } from '@/widgets/weather-grid';

const { grid } = storeToRefs(useWeatherGridStore());
const text = messages.ru;
</script>

<template>
  <main class="weather-page" :aria-label="text.weather">
    <h1 class="visually-hidden">{{ text.appName }}</h1>
    <WeatherGrid :grid="grid" />
  </main>
</template>
