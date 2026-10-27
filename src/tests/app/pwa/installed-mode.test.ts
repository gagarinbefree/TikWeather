import { describe, expect, it, vi } from 'vitest';
import { isInstalledPwa } from '@/app/pwa/installed-mode';

describe('isInstalledPwa', () => {
  it('does not treat an ordinary browser tab as an installed app', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false });

    expect(isInstalledPwa({ matchMedia }, { standalone: false })).toBe(false);
  });

  it('recognizes standalone and window controls overlay display modes', () => {
    const standaloneMode = vi.fn((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));
    const overlayMode = vi.fn((query: string) => ({
      matches: query === '(display-mode: window-controls-overlay)',
    }));

    expect(isInstalledPwa({ matchMedia: standaloneMode }, {})).toBe(true);
    expect(isInstalledPwa({ matchMedia: overlayMode }, {})).toBe(true);
    expect(standaloneMode).toHaveBeenCalledWith('(display-mode: standalone)');
    expect(overlayMode).toHaveBeenCalledWith('(display-mode: window-controls-overlay)');
  });

  it('recognizes an installed iOS home screen app', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false });

    expect(isInstalledPwa({ matchMedia }, { standalone: true })).toBe(true);
  });
});
