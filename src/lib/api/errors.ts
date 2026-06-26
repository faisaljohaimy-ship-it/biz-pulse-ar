/**
 * Standard error envelope for server functions and route handlers.
 * Use throughout the API layer instead of throwing raw `Error` instances
 * with arbitrary shapes. Clients can switch on `code` for UX.
 */

export type ApiErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "upstream_failed"
  | "upstream_timeout"
  | "internal_error";

export interface ApiErrorShape {
  code: ApiErrorCode;
  message: string;
  status: number;
  /** Stable identifier used to correlate logs (e.g. Microsoft Graph requestId). */
  requestId?: string;
  /** Free-form, JSON-serialisable details. Never include secrets. */
  details?: Record<string, unknown>;
}

export class ApiError extends Error implements ApiErrorShape {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.code = shape.code;
    this.status = shape.status;
    this.requestId = shape.requestId;
    this.details = shape.details;
  }

  toJSON(): ApiErrorShape {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      requestId: this.requestId,
      details: this.details,
    };
  }
}

const STATUS: Record<ApiErrorCode, number> = {
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  upstream_failed: 502,
  upstream_timeout: 504,
  internal_error: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  extra: { requestId?: string; details?: Record<string, unknown>; status?: number } = {},
): ApiError {
  return new ApiError({
    code,
    message,
    status: extra.status ?? STATUS[code],
    requestId: extra.requestId,
    details: extra.details,
  });
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Normalise any thrown value into a serialisable envelope. */
export function toApiErrorShape(err: unknown): ApiErrorShape {
  if (isApiError(err)) return err.toJSON();
  if (err instanceof Error) {
    return { code: "internal_error", message: err.message, status: 500 };
  }
  return { code: "internal_error", message: String(err ?? "Unknown error"), status: 500 };
}
