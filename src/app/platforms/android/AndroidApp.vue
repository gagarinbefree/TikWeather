<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { useCurrentWeatherStore } from '@/features/current-weather';
import { WeatherPage } from '@/pages/weather';
import { useUpdatePrompt } from '@/app/model/use-update-prompt';
import PwaUpdatePrompt from '@/app/ui/PwaUpdatePrompt.vue';
import { androidApkUrl, hasAndroidUpdate } from './update';

const { locale } = storeToRefs(useCurrentWeatherStore());
const { updateAvailable, navigationReset, dismissUpdate } = useUpdatePrompt();

onMounted(async () => {
  const buildVersion: unknown = import.meta.env['VITE_APP_VERSION'];
  updateAvailable.value = await hasAndroidUpdate(
    typeof buildVersion === 'string' ? buildVersion : '0.1.0',
  );
});
</script>

<template>
  <WeatherPage :navigation-reset="navigationReset" />
  <PwaUpdatePrompt
    v-if="updateAvailable"
    :locale="locale"
    :update-url="androidApkUrl"
    @dismiss="dismissUpdate"
  />
</template>
