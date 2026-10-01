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
} from "./providers";
import type {
  HostedProviderRequest,
  HostedProviderResult,
} from "./types";

type GroqMessage = {
  content?: unknown;
};

type GroqChoice = {
  message?: GroqMessage;
};

type GroqUsage = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  total_tokens?: unknown;
};

type GroqResponse = {
  id?: unknown;
  choices?: GroqChoice[];
  usage?: GroqUsage;
};

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export class GroqHostedProvider
  implements HostedProvider
{
  readonly id = "groq" as const;

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
        "groq",
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
      const response =
        await fetchWithProviderTimeout(
          GROQ_API_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: this.model,
              messages: [
                {
                  role: "user",
                  content: request.prompt,
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
        body as GroqResponse;

      const message =
        parsed.choices?.[0]?.message;

      const text =
        typeof message?.content === "string"
          ? message.content
          : undefined;

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
        typeof parsed.usage
          ?.prompt_tokens === "number"
          ? parsed.usage.prompt_tokens
          : undefined;

      const outputTokens =
        typeof parsed.usage
          ?.completion_tokens === "number"
          ? parsed.usage
              .completion_tokens
          : undefined;

      const providerRequestId =
        typeof parsed.id === "string"
          ? parsed.id
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