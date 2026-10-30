import { afterEach, describe, expect, it, vi } from 'vitest';
import { androidApkUrl, hasAndroidUpdate } from '@/app/platforms/android/update';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hasAndroidUpdate', () => {
  it('checks ZoomWeather releases and downloads the branded Android APK', async () => {
    const fetchRelease = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: 'v0.1.43' }),
    });
    vi.stubGlobal('fetch', fetchRelease);

    expect(await hasAndroidUpdate('0.1.42')).toBe(true);
    expect(fetchRelease).toHaveBeenCalledWith(
      'https://api.github.com/repos/gagarinbefree/ZoomWeather/releases/latest',
      expect.objectContaining({ headers: { Accept: 'application/vnd.github+json' } }),
    );
    expect(androidApkUrl).toBe(
      'https://github.com/gagarinbefree/ZoomWeather/releases/latest/download/ZoomWeather-Android.apk',
    );
  });

  it('offers a newer Android release', async () => {
    const loadLatest = vi.fn().mockResolvedValue({ tag_name: 'v0.1.43' });

    expect(await hasAndroidUpdate('0.1.42', loadLatest)).toBe(true);
    expect(loadLatest).toHaveBeenCalledOnce();
  });

  it('ignores the installed release and older releases', async () => {
    expect(await hasAndroidUpdate('0.1.43', () => Promise.resolve({ tag_name: 'v0.1.43' }))).toBe(
      false,
    );
    expect(await hasAndroidUpdate('0.1.44', () => Promise.resolve({ tag_name: 'v0.1.43' }))).toBe(
      false,
    );
  });

  it('does not show a false update when the release cannot be read', async () => {
    expect(await hasAndroidUpdate('0.1.42', () => Promise.resolve({ tag_name: 'latest' }))).toBe(
      false,
    );
    expect(await hasAndroidUpdate('0.1.42', () => Promise.reject(new Error('offline')))).toBe(
      false,
    );
  });
});
