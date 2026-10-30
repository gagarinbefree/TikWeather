const latestReleaseUrl = 'https://api.github.com/repos/gagarinbefree/ZoomWeather/releases/latest';

export const androidApkUrl =
  'https://github.com/gagarinbefree/ZoomWeather/releases/latest/download/ZoomWeather-Android.apk';

/**
 * loadLatestRelease. Fetch the latest public release from GitHub
 *
 * @returns The latest public GitHub release
 */
async function loadLatestRelease(): Promise<unknown> {
  const response = await fetch(latestReleaseUrl, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`GitHub release lookup returned ${String(response.status)}`);
  return response.json();
}

/**
 * parseVersion. Split a valid version into numeric parts
 *
 * @param value The application or release version
 * @returns The numeric version parts when the format is valid
 */
function parseVersion(value: string): readonly number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return null;
  return match.slice(1).map(Number);
}

/**
 * hasAndroidUpdate. Compare the installed version with the latest Android release
 *
 * @param installedVersion The version of the installed Android app
 * @param loadLatest The release lookup
 * @returns Whether a newer signed APK is available
 */
export async function hasAndroidUpdate(
  installedVersion: string,
  loadLatest: () => Promise<unknown> = loadLatestRelease,
): Promise<boolean> {
  try {
    const release: unknown = await loadLatest();
    if (typeof release !== 'object' || release === null || !('tag_name' in release)) return false;
    if (typeof release.tag_name !== 'string') return false;
    const installed = parseVersion(installedVersion);
    const latest = parseVersion(release.tag_name);
    if (!installed || !latest) return false;
    for (let index = 0; index < 3; index++) {
      const difference = (latest[index] ?? 0) - (installed[index] ?? 0);
      if (difference !== 0) return difference > 0;
    }
    return false;
  } catch {
    return false;
  }
}
