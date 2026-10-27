export type FailureKind =
  | 'connection'
  | 'timeout'
  | 'credentials'
  | 'unavailable'
  | 'invalidResponse'
  | 'configuration'
  | 'cancelled';

export type LocationQuery =
  | {
      readonly source: 'device' | 'ip';
      readonly latitude: number;
      readonly longitude: number;
      readonly countryCode: string | null;
      readonly city?: string;
      readonly region?: string;
    }
  | { readonly source: 'automatic' };

export interface RequestOptions {
  readonly signal?: AbortSignal;
  readonly fetcher?: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * ApiError. Represent a safe API failure without request URLs or provider details
 */
export class ApiError extends Error {
  constructor(readonly kind: FailureKind) {
    super(kind);
    this.name = 'ApiError';
  }
}
