import {
  assertProviderApiKey,
  createProviderFailureResult,
  fetchWithProviderTimeout,
  isRetryableProviderStatus,
  mapProviderStatusToErrorCode,
  readJsonResponse,
} from "./provider-utils";
import type {
  HostedProvider,
  HostedProviderRequest,
} from "./providers";
import type {
  HostedProviderResult,
} from "./types";

type GeminiPart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiUsageMetadata = {
  promptTokenCount?: unknown;
  candidatesTokenCount?: unknown;
  totalTokenCount?: unknown;
};

type GeminiResponse = {
  responseId?: unknown;
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
};

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiHostedProvider
  implements HostedProvider
{
  readonly id = "gemini" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: {
    apiKey: string | undefined;
    model: string;
    timeoutMs?: number;
  }) {
    this.apiKey = options.apiKey ?? "";
    this.model = options.model.trim();
    this.timeoutMs =
      options.timeoutMs ?? 30_000;
  }

  async generate(
    request: HostedProviderRequest,
  ): Promise<HostedProviderResult> {
    const startedAt = Date.now();

    let apiKey: string;

    try {
      apiKey = assertProviderApiKey(
        "gemini",
        this.apiKey,
      );
    } catch {
      return createProviderFailureResult(
        "PROVIDER_CONFIGURATION_ERROR",
        {
          latencyMs: Date.now() - startedAt,
          retryable: false,
        },
      );
    }

    if (!this.model) {
      return createProviderFailureResult(
        "PROVIDER_CONFIGURATION_ERROR",
        {
          latencyMs: Date.now() - startedAt,
          retryable: false,
        },
      );
    }

    try {
      const url =
        `${GEMINI_API_BASE}/` +
        `${encodeURIComponent(this.model)}:generateContent`;

      const response =
        await fetchWithProviderTimeout(
          url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: request.prompt,
                    },
                  ],
                },
              ],
            }),
          },
          this.timeoutMs,
        );

      const body =
        await readJsonResponse(response);

      if (!response.ok) {
        const errorCode =
          mapProviderStatusToErrorCode(
            response.status,
          );

        return createProviderFailureResult(
          errorCode,
          {
            latencyMs:
              Date.now() - startedAt,
            retryable:
              isRetryableProviderStatus(
                response.status,
              ),
          },
        );
      }

      const parsed =
        body as GeminiResponse;

      const candidate =
        parsed.candidates?.[0];

      const text = candidate?.content?.parts
        ?.map((part) => part.text)
        .filter(
          (value): value is string =>
            typeof value === "string",
        )
        .join("");

      if (!text?.trim()) {
        return createProviderFailureResult(
          "PROVIDER_REJECTED",
          {
            latencyMs:
              Date.now() - startedAt,
            retryable: false,
          },
        );
      }

      const inputTokens =
        typeof parsed.usageMetadata
          ?.promptTokenCount === "number"
          ? parsed.usageMetadata
              .promptTokenCount
          : undefined;

      const outputTokens =
        typeof parsed.usageMetadata
          ?.candidatesTokenCount === "number"
          ? parsed.usageMetadata
              .candidatesTokenCount
          : undefined;

      const providerRequestId =
        typeof parsed.responseId === "string"
          ? parsed.responseId
          : undefined;

      return {
        ok: true,
        text,
        latencyMs:
          Date.now() - startedAt,
        inputTokens,
        outputTokens,
        providerRequestId,
        retryable: false,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "";

      if (
        message === "PROVIDER_TIMEOUT"
      ) {
        return createProviderFailureResult(
          "PROVIDER_TIMEOUT",
          {
            latencyMs:
              Date.now() - startedAt,
            retryable: true,
          },
        );
      }

      if (
        message ===
        "PROVIDER_INVALID_JSON"
      ) {
        return createProviderFailureResult(
          "PROVIDER_UNAVAILABLE",
          {
            latencyMs:
              Date.now() - startedAt,
            retryable: true,
          },
        );
      }

      return createProviderFailureResult(
        "PROVIDER_UNAVAILABLE",
        {
          latencyMs:
            Date.now() - startedAt,
          retryable: true,
        },
      );
    }
  }
}