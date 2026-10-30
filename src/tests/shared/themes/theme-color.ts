import theme from '@assets/themes/default.json' with { type: 'json' };

/**
 * themeRgbColor. Read a theme color in the format reported by browsers
 *
 * @param name The name of a theme color stored as six hexadecimal digits
 * @returns The theme color as an RGB string
 */
export function themeRgbColor(name: keyof typeof theme.colors): string {
  const color = theme.colors[name];
  const channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  return `rgb(${channels.join(', ')})`;
}
