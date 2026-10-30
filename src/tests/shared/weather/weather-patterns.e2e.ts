import { readFile, readdir } from 'node:fs/promises';
import { expect, test } from '@/tests/shared/lib/browser-test';

test('ships twelve cropped WebP drawings with one shared natural size', async ({ page }) => {
  const directory = 'shared/assets/images';
  const files = (await readdir(directory)).filter((file) => file.endsWith('.webp'));
  expect(files).toHaveLength(12);
  for (const file of files) {
    const bytes = await readFile(`${directory}/${file}`);
    const original = await readFile(`${directory}/${file.replace(/\.webp$/, '.png')}`);
    expect(bytes.length).toBeLessThan(original.length / 3);
    const size = await page.evaluate(
      async (url) => {
        const image = await createImageBitmap(await (await fetch(url)).blob());
        return { width: image.width, height: image.height };
      },
      `data:image/webp;base64,${bytes.toString('base64')}`,
    );
    expect(size, file).toEqual({ width: 338, height: 275 });
  }
});
