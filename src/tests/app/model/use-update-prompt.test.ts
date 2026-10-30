import { describe, expect, it } from 'vitest';
import { useUpdatePrompt } from '@/app/model/use-update-prompt';

describe('Update prompt navigation', () => {
  it('closes the update screen and resets the forecast to current weather on every dismissal', async () => {
    const prompt = useUpdatePrompt();
    prompt.updateAvailable.value = true;
    await prompt.dismissUpdate();
    expect(prompt.updateAvailable.value).toBe(false);
    expect(prompt.navigationReset.value).toBe(1);
    prompt.updateAvailable.value = true;
    await prompt.dismissUpdate();
    expect(prompt.navigationReset.value).toBe(2);
  });
});
