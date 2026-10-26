<script setup lang="ts">
defineProps<{ readonly label: string }>();
</script>

<template>
  <div class="loading-indicator" role="status" :aria-label="label">
    <span class="spinner-border" aria-hidden="true" />
    <span class="visually-hidden">{{ label }}</span>
  </div>
</template>

<style scoped>
.loading-indicator {
  display: grid;
  place-items: center;
  color: var(--weather-accent);
}

.spinner-border {
  --spinner-width: 3.5rem;
  --spinner-height: 3.5rem;
  --spinner-border-width: 0.35rem;
}
</style>
