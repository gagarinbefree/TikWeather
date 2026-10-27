import { describe, expect, it, vi } from 'vitest';
import { createAndroidGeolocation } from '@/app/platforms/android/geolocation';

describe('createAndroidGeolocation', () => {
  it('passes native coordinates to the existing location flow', async () => {
    const getCurrentPosition = vi.fn().mockResolvedValue({
      coords: { latitude: 58.0047, longitude: 56.2514 },
    });
    const device = createAndroidGeolocation({ getCurrentPosition });
    const success = vi.fn();
    const failure = vi.fn();

    device.getCurrentPosition(success, failure, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000,
    });
    await vi.waitFor(() => {
      expect(success).toHaveBeenCalledOnce();
    });

    expect(getCurrentPosition).toHaveBeenCalledWith({
      enableHighAccuracy: true,
      timeout: 11000,
      maximumAge: 60000,
    });
    expect(success).toHaveBeenCalledWith({ coords: { latitude: 58.0047, longitude: 56.2514 } });
    expect(failure).not.toHaveBeenCalled();
  });

  it('allows the location flow to fall back to IP when native location fails', async () => {
    const device = createAndroidGeolocation({
      getCurrentPosition: vi.fn().mockRejectedValue(new Error('permission denied')),
    });
    const failure = vi.fn();

    device.getCurrentPosition(vi.fn(), failure, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000,
    });

    await vi.waitFor(() => {
      expect(failure).toHaveBeenCalledOnce();
    });
  });
});
