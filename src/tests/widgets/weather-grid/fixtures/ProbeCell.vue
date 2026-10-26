<script setup lang="ts">
import { inject, ref } from 'vue';
import { useWeatherGridStore } from '@/entities/weather';

defineProps<{ readonly id: string }>();
const marker = inject<string>('test-context', 'missing');
const store = useWeatherGridStore();
const count = ref(0);
</script>

<template>
  <p data-probe-context>{{ marker }} {{ store.grid.length }}</p>
  <button type="button" :data-probe-id="id" @click="count++">{{ count }}</button>
</template>
