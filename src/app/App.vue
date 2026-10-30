<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import { useCurrentWeatherStore } from '@/features/current-weather';
import { WeatherPage } from '@/pages/weather';
import { useUpdatePrompt } from '@/app/model/use-update-prompt';
import { isInstalledPwa } from './pwa/installed-mode';
import PwaUpdatePrompt from './ui/PwaUpdatePrompt.vue';

const { locale } = storeToRefs(useCurrentWeatherStore());
const { updateAvailable, navigationReset, dismissUpdate } = useUpdatePrompt();
const updateSW = registerSW({
  onNeedRefresh: () => {
    updateAvailable.value = isInstalledPwa();
  },
});

/**
 * applyUpdate. Activate the new PWA version and reload the app
 */
function applyUpdate(): void {
  void updateSW(true);
}
</script>

<template>
  <WeatherPage :navigation-reset="navigationReset" />
  <PwaUpdatePrompt
    v-if="updateAvailable"
    :locale="locale"
    @update="applyUpdate"
    @dismiss="dismissUpdate"
  />
</template>
