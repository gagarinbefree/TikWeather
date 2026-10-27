<script setup lang="ts">
import { computed } from 'vue';
import { messages, type Locale } from '@/shared/locales';

const props = defineProps<{ readonly locale: Locale }>();
const emit = defineEmits<{ update: []; dismiss: [] }>();
const text = computed(() => messages[props.locale]);
</script>

<template>
  <aside class="pwa-update" role="status">
    <span>{{ text.updateAvailable }}</span>
    <div class="pwa-update__actions">
      <button type="button" class="btn" data-action="update" @click="emit('update')">
        {{ text.updateNow }}
      </button>
      <button type="button" class="btn" data-action="dismiss" @click="emit('dismiss')">
        {{ text.updateLater }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
@layer custom {
  .pwa-update {
    position: fixed;
    z-index: 10;
    inset-inline: 1rem;
    inset-block-end: max(1rem, env(safe-area-inset-bottom));
    max-inline-size: 30rem;
    margin-inline: auto;
    padding: 0.8rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    background: var(--weather-surface);
    color: var(--weather-ink);
    border: 1px solid var(--weather-muted);
    border-radius: var(--radius-5);
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 15%);
  }
  .pwa-update__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .pwa-update .btn {
    --btn-bg: var(--weather-page);
    --btn-color: var(--weather-ink);
  }
}
</style>
