<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import { useCurrentWeatherStore } from '@/features/current-weather';
import { WeatherPage } from '@/pages/weather';
import { isInstalledPwa } from './pwa/installed-mode';
import PwaUpdatePrompt from './ui/PwaUpdatePrompt.vue';

const { locale } = storeToRefs(useCurrentWeatherStore());
const updateAvailable = ref(false);
const updateSW = registerSW({
  onNeedRefresh: () => {
    updateAvailable.value = isInstalledPwa();
  },
});

/**
 * applyUpdate
 */
function applyUpdate(): void {
  void updateSW(true);
}
</script>

<template>
  <WeatherPage />
  <PwaUpdatePrompt
    v-if="updateAvailable"
    :locale="locale"
    @update="applyUpdate"
    @dismiss="updateAvailable = false"
  />
</template>
