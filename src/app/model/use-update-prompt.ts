import { nextTick, ref, type Ref } from 'vue';

interface UpdatePromptState {
  readonly updateAvailable: Ref<boolean>;
  readonly navigationReset: Ref<number>;
  readonly dismissUpdate: () => Promise<void>;
}

/**
 * useUpdatePrompt. Share update dismissal and return to current weather
 *
 * @returns The update visibility and forecast reset state for PWA and Android
 */
export function useUpdatePrompt(): UpdatePromptState {
  const updateAvailable = ref(false);
  const navigationReset = ref(0);

  /**
   * dismissUpdate. Close the update card and focus current weather
   *
   * @returns A promise that resolves after current weather is selected
   */
  async function dismissUpdate(): Promise<void> {
    navigationReset.value++;
    updateAvailable.value = false;
    await nextTick();
    document.querySelector<HTMLElement>('.weather-viewport')?.focus({ preventScroll: true });
  }

  return { updateAvailable, navigationReset, dismissUpdate };
}
