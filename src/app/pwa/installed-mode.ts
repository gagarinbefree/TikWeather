interface DisplayModeEnvironment {
  matchMedia(query: string): { readonly matches: boolean };
}

interface StandaloneNavigator {
  readonly standalone?: boolean;
}

/**
 * isInstalledPwa
 * @param display The browser display mode API
 * @param navigation The browser navigation state
 * @returns Whether the page runs as an installed app
 */
export function isInstalledPwa(
  display: DisplayModeEnvironment = window,
  navigation: StandaloneNavigator = navigator as StandaloneNavigator,
): boolean {
  return (
    navigation.standalone === true ||
    display.matchMedia('(display-mode: standalone)').matches ||
    display.matchMedia('(display-mode: window-controls-overlay)').matches
  );
}
