<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import { useCurrentWeatherStore } from '@/features/current-weather';
import { WeatherPage } from '@/pages/weather';
import PwaUpdatePrompt from '@/app/ui/PwaUpdatePrompt.vue';
import { androidApkUrl, hasAndroidUpdate } from './update';

const { locale } = storeToRefs(useCurrentWeatherStore());
const updateAvailable = ref(false);

onMounted(async () => {
  const buildVersion: unknown = import.meta.env['VITE_APP_VERSION'];
  updateAvailable.value = await hasAndroidUpdate(
    typeof buildVersion === 'string' ? buildVersion : '0.1.0',
  );
});
</script>

<template>
  <WeatherPage />
  <PwaUpdatePrompt
    v-if="updateAvailable"
    :locale="locale"
    :update-url="androidApkUrl"
    @dismiss="updateAvailable = false"
  />
</template>
