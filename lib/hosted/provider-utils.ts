
import type {
  HostedErrorCode,
  HostedProviderResult,
} from "./types";

export const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;

export type ProviderHttpResponse = {
  status: number;
  body: unknown;
};

export function isRetryableProviderStatus(
  status: number,
): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

export function mapProviderStatusToErrorCode(
  status: number,
): HostedErrorCode {
  if (status === 429) {
    return "PROVIDER_RATE_LIMITED";
  }

  if (status === 408) {
    return "PROVIDER_TIMEOUT";
  }

  if (status >= 500) {
    return "PROVIDER_UNAVAILABLE";
  }

  if (status === 400 || status === 422) {
    return "PROVIDER_REJECTED";
  }

  if (status === 401 || status === 403) {
    return "PROVIDER_CONFIGURATION_ERROR";
  }

  return "PROVIDER_REJECTED";
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}

function createBufferedResponse(
  response: Response,
  bodyText: string,
): Response {
  const headers = new Headers(response.headers);

  // The response body has been reconstructed from text, so
  // the original transport encoding and byte length no longer
  // describe the locally buffered response.
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  const statusForbidsBody =
    response.status === 204 ||
    response.status === 205 ||
    response.status === 304;

  return new Response(
    statusForbidsBody || bodyText.length === 0
      ? null
      : bodyText,
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}

export async function fetchWithProviderTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      "PROVIDER_TIMEOUT_CONFIGURATION_INVALID",
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    // Keep the deadline active while reading the body,
    // not just while waiting for response headers.
    const bodyText = await response.text();

    if (controller.signal.aborted) {
      throw new Error("PROVIDER_TIMEOUT");
    }

    return createBufferedResponse(
      response,
      bodyText,
    );
  } catch (error) {
    if (
      controller.signal.aborted ||
      isAbortError(error)
    ) {
      throw new Error("PROVIDER_TIMEOUT");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readJsonResponse(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("PROVIDER_INVALID_JSON");
  }
}

export function createProviderFailureResult(
  errorCode: HostedErrorCode,
  options?: {
    latencyMs?: number;
    retryable?: boolean;
  },
): HostedProviderResult {
  const defaultRetryable =
    errorCode === "PROVIDER_RATE_LIMITED" ||
    errorCode === "PROVIDER_TIMEOUT" ||
    errorCode === "PROVIDER_UNAVAILABLE";

  return {
    ok: false,
    latencyMs: options?.latencyMs ?? 0,
    errorCode,
    retryable:
      options?.retryable ?? defaultRetryable,
  };
}

export function assertProviderApiKey(
  provider: string,
  apiKey: string | undefined,
): string {
  const key = apiKey?.trim();

  if (!key) {
    throw new Error(
      `HOSTED_PROVIDER_API_KEY_MISSING:${provider}`,
    );
  }

  return key;
}
