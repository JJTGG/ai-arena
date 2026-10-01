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

export async function fetchWithProviderTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
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
    return JSON.parse(text);
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