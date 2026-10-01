import type { HostedErrorCode } from "./types";

export class HostedError extends Error {
  readonly code: HostedErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    code: HostedErrorCode,
    options?: {
      message?: string;
      status?: number;
      retryable?: boolean;
    },
  ) {
    super(options?.message ?? code);

    this.name = "HostedError";
    this.code = code;
    this.status = options?.status ?? 400;
    this.retryable = options?.retryable ?? false;
  }
}

export function isHostedError(
  error: unknown,
): error is HostedError {
  return error instanceof HostedError;
}

export function toHostedError(
  error: unknown,
): HostedError {
  if (isHostedError(error)) {
    return error;
  }

  return new HostedError("INTERNAL_ERROR", {
    status: 500,
    retryable: true,
  });
}

export function hostedErrorResponse(
  error: unknown,
): Response {
  const hostedError = toHostedError(error);

  return Response.json(
    {
      error: {
        code: hostedError.code,
        message: hostedError.message,
        retryable: hostedError.retryable,
      },
    },
    {
      status: hostedError.status,
    },
  );
}