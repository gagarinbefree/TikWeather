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
  readonly onResponse?: (response: Response) => void;
}

/**
 * ApiError. Represent a safe API failure without request URLs or provider details
 */
export class ApiError extends Error {
  /**
   * constructor. Create a safe failure without response text or request URLs
   *
   * @param kind The localized failure category.
   * @param status The optional HTTP status for transport decisions.
   * @param sharedLimit Whether the backend entrance rejected all provider routes.
   */
  constructor(
    readonly kind: FailureKind,
    readonly status?: number,
    readonly sharedLimit = false,
  ) {
    super(kind);
    this.name = 'ApiError';
  }
}
