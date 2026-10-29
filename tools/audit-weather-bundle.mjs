import process from 'node:process';
import { log } from 'node:console';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const forbidden = [
  'api.weatherapi.com',
  'api.open-meteo.com',
  'api.openweathermap.org',
  'VITE_WEATHER_API_KEY',
  'VITE_OPENWEATHERMAP_API_KEY',
];

/**
 * auditDirectory. Reject direct weather providers and credential wiring in a built application
 *
 * @param {string} directory The completed site or Android web bundle.
 * @returns {Promise<number>} The number of inspected text assets.
 */
async function auditDirectory(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += await auditDirectory(path);
    else if (['.js', '.json', '.html', '.css', '.webmanifest'].includes(extname(path))) {
      const content = await readFile(path, 'utf8');
      if (forbidden.some((value) => content.includes(value)))
        throw new Error(
          `Built application contains direct provider or credential wiring in ${path}`,
        );
      count++;
    }
  }
  return count;
}

const roots = process.argv.slice(2);
if (!roots.length) throw new Error('Specify a completed application bundle');
for (const root of roots) {
  const count = await auditDirectory(root);
  if (!count) throw new Error(`No application assets found in ${root}`);
  log(`Verified ${count} application assets in ${root} without weather provider credentials`);
}
