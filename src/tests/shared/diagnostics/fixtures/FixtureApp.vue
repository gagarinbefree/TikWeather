<script setup lang="ts">
import { ref } from 'vue';
import { requestJson } from '@/shared/api';
import { reportFailure } from '@/shared/diagnostics';
const status = ref('Ready');

/**
 * failRequest. Exercise the real API transport and handled failure reporting
 *
 * @returns A promise that settles after the failure remains usable in the interface.
 */
async function failRequest(): Promise<void> {
  try {
    await requestJson(
      'https://weather.example.test/api/weatherapi/v1/current.json?key=private-key&q=58.0047,56.2514',
    );
  } catch (error) {
    reportFailure(error, 'current');
    status.value = 'Handled';
  }
}

/**
 * failComponent. Exercise Vue error reporting without exposing the original message
 */
function failComponent(): void {
  throw new Error('private-key https://example.test?token=private-key 188.16.96.136');
}
</script>
<template>
  <p role="status">{{ status }}</p>
  <button @click="failRequest">Fail request</button>
  <button @click="failComponent">Fail component</button>
</template>
