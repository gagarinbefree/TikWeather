<script setup lang="ts">
import { provide, ref, shallowRef } from 'vue';
import { WeatherGrid } from '@/widgets/weather-grid';
import { baseThemeStyle } from '@/shared/themes';
import { fixtureGrid } from './grid';
import ProbeCell from './ProbeCell.vue';

provide('test-context', 'fixture');
const grid = shallowRef(fixtureGrid);
const mounted = ref(true);

/**
 * removeTomorrow
 */
function removeTomorrow(): void {
  grid.value = fixtureGrid.filter((_, index) => index !== 1);
}

/**
 * restoreForecast
 */
function restoreForecast(): void {
  grid.value = fixtureGrid;
}

/**
 * removeForecast
 */
function removeForecast(): void {
  grid.value = fixtureGrid.slice(0, 1);
}
</script>

<template>
  <main class="weather-page" :style="baseThemeStyle">
    <WeatherGrid v-if="mounted" :grid="grid">
      <template #default="{ cell }">
        <div>
          <p data-fixture-label>{{ cell.id }}</p>
          <ProbeCell :id="cell.id" />
        </div>
      </template>
    </WeatherGrid>
  </main>
  <aside class="fixture-controls" aria-label="Fixture controls">
    <button type="button" @click="removeTomorrow">Remove tomorrow</button>
    <button type="button" @click="restoreForecast">Restore forecast</button>
    <button type="button" @click="removeForecast">Remove forecast</button>
    <button type="button" @click="mounted = !mounted">Toggle viewport</button>
  </aside>
</template>

<style scoped>
.fixture-controls {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  max-inline-size: 100%;
}
</style>
