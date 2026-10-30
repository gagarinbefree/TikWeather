/* global createImageBitmap, document, fetch, URL */
import { chromium } from '@playwright/test';
import { log } from 'node:console';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../shared/assets/images/', import.meta.url);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const sources = [];
  for (const name of (await readdir(directory)).filter((file) => file.endsWith('.png')).sort()) {
    const bytes = await readFile(new URL(name, directory));
    sources.push({ name, url: `data:image/png;base64,${bytes.toString('base64')}` });
  }
  // Crop every drawing without scaling pixels or changing the original artwork.
  const tiles = await page.evaluate(async (sources) => {
    const images = [];
    for (const source of sources) {
      const image = await createImageBitmap(await (await fetch(source.url)).blob());
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      let left = image.width,
        top = image.height,
        right = -1,
        bottom = -1;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const offset = (y * image.width + x) * 4;
          if (
            pixels[offset + 3] > 128 &&
            Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]) < 220
          ) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      }
      if (right < left || bottom < top) throw new Error(`Empty drawing ${source.name}`);
      images.push({
        name: source.name,
        image,
        left,
        top,
        width: right - left + 1,
        height: bottom - top + 1,
      });
    }
    const width = Math.min(...images.map((item) => item.width));
    const height = Math.min(...images.map((item) => item.height));
    const tiles = [];
    for (const source of images) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      const x = source.left + Math.floor((source.width - width) / 2);
      const y = source.top + Math.floor((source.height - height) / 2);
      context.drawImage(source.image, x, y, width, height, 0, 0, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
      if (!blob || blob.type !== 'image/webp') throw new Error('WebP encoding is unavailable');
      tiles.push({
        name: source.name.replace(/\.png$/, '.webp'),
        width,
        height,
        bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
      });
    }
    return tiles;
  }, sources);
  for (const tile of tiles) {
    await writeFile(new URL(tile.name, directory), new Uint8Array(tile.bytes));
    log(`${tile.name} ${tile.width}x${tile.height} ${tile.bytes.length} bytes`);
  }
} finally {
  await browser.close();
}
