import type { AIProviderAdapter } from "../provider";
import type { AIRequest, AIResponse } from "../types";
import { fetchWithProviderTimeout } from "../../hosted/provider-utils";

const OPENAI_MODEL = "gpt-5.6-luna";

export const openAIAdapter: AIProviderAdapter = {
  provider: {
    id: "openai",
    name: "OpenAI",
    model: OPENAI_MODEL,
  },

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = localStorage.getItem("ai-arena-openai-key");

    if (!apiKey) {
      throw new Error("OpenAI API key is not configured.");
    }

    const input = [
      ...request.history,
      {
        role: "user" as const,
        content: request.message,
      },
    ];

    let response: Response;

    try {
      response = await fetchWithProviderTimeout(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            input,
          }),
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PROVIDER_TIMEOUT"
      ) {
        throw new Error(
          "OpenAI request timed out. Please try again.",
        );
      }

      const detail =
        error instanceof Error
          ? error.message
          : "Unknown network error.";

      throw new Error(
        `OpenAI network request failed: ${detail}`,
      );
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `OpenAI HTTP ${response.status}: ${
          responseText || "No response body."
        }`,
      );
    }

    let data: { output_text?: unknown };

    try {
      data = JSON.parse(responseText) as {
        output_text?: unknown;
      };
    } catch {
      throw new Error(
        "OpenAI returned an invalid response.",
      );
    }

    return {
      provider: "openai",
      model: OPENAI_MODEL,
      content:
        typeof data.output_text === "string"
          ? data.output_text
          : "",
    };
  },
};