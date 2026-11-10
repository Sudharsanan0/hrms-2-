// ============================================================
// Clixhora HRMS — Shared error type
//
// A failed database request must NEVER be converted into an empty
// (successful) result. Services throw `ServiceError` and the UI renders
// a dedicated error state instead of a misleading "0".
// ============================================================

export type ServiceErrorKind =
  | 'not_configured'
  | 'network'
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'unknown';

export class ServiceError extends Error {
  readonly kind: ServiceErrorKind;
  readonly cause?: unknown;

  constructor(kind: ServiceErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.kind = kind;
    this.cause = cause;
  }
}

export const notConfiguredError = (message: string) =>
  new ServiceError('not_configured', message);

export const toServiceError = (err: unknown, fallback = 'Something went wrong. Please try again.'): ServiceError => {
  if (err instanceof ServiceError) return err;
  const message = err instanceof Error ? err.message : String(err ?? '');
  return new ServiceError('unknown', message || fallback, err);
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.'): string =>
  toServiceError(err, fallback).message;
