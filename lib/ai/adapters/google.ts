
import type { AIProviderAdapter } from "../provider";
import type { AIRequest, AIResponse } from "../types";
import {
  fetchWithProviderTimeout,
} from "../../hosted/provider-utils";

const GOOGLE_MODEL = "gemini-3.6-flash";

type GoogleInteractionResponse = {
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export const googleAdapter: AIProviderAdapter = {
  provider: {
    id: "google",
    name: "Google",
    model: GOOGLE_MODEL,
  },

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = localStorage.getItem("ai-arena-google-key");

    if (!apiKey) {
      throw new Error("Google API key is not configured.");
    }

    const input = [
      ...request.history.map((message) => ({
        type:
          message.role === "user"
            ? "user_input"
            : "model_output",
        content: [
          {
            type: "text",
            text: message.content,
          },
        ],
      })),
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text: request.message,
          },
        ],
      },
    ];

    let response: Response;

    try {
      response = await fetchWithProviderTimeout(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            model: GOOGLE_MODEL,
            input,
            store: false,
          }),
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PROVIDER_TIMEOUT"
      ) {
        throw new Error(
          "Google request timed out. Please try again.",
        );
      }

      throw new Error(
        "Google request could not be completed. Check your connection and try again.",
      );
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Google request failed: ${responseText || `HTTP ${response.status}`}`,
      );
    }

    let data: GoogleInteractionResponse;

    try {
      data = JSON.parse(
        responseText,
      ) as GoogleInteractionResponse;
    } catch {
      throw new Error(
        "Google returned an invalid response.",
      );
    }

    const content =
      data.steps
        ?.filter(
          (step) => step.type === "model_output",
        )
        .flatMap(
          (step) => step.content ?? [],
        )
        .filter(
          (item) => item.type === "text",
        )
        .map(
          (item) => item.text ?? "",
        )
        .join("") ?? "";

    return {
      provider: "google",
      model: GOOGLE_MODEL,
      content,
    };
  },
};
