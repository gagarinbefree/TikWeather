export interface DeviceGeolocation {
  getCurrentPosition: (
    success: (position: {
      readonly coords: { readonly latitude: number; readonly longitude: number };
    }) => void,
    failure: () => void,
    options: PositionOptions,
  ) => void;
}
