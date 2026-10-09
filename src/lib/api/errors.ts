import type { ApiErrorBody } from '@/types/api';

/**
 * Thrown by the fetch wrapper for any non-2xx response, network failure or timeout.
 * Everything downstream (resource functions, queries, error boundaries) can rely on
 * `status` and `code` rather than sniffing unknown error shapes.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;
  readonly url?: string;

  constructor(options: {
    message: string;
    status: number;
    code?: string;
    fields?: Record<string, string[]>;
    url?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code ?? codeForStatus(options.status);
    this.fields = options.fields;
    this.url = options.url;
  }

  /** Serializable form of this error — never leaks stack traces. */
  toBody(): ApiErrorBody {
    return { message: this.message, code: this.code, ...(this.fields && { fields: this.fields }) };
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    return new ApiError({
      message: 'An unexpected error occurred',
      status: 500,
      code: 'internal_error',
      cause: error,
    });
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 408:
      return 'timeout';
    case 409:
      return 'conflict';
    case 422:
      return 'validation_error';
    case 429:
      return 'rate_limited';
    default:
      return status >= 500 ? 'internal_error' : 'request_failed';
  }
}
