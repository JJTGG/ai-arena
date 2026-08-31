import type { AIProviderAdapter } from "../provider";
import type { AIRequest, AIResponse } from "../types";

const GOOGLE_MODEL = "gemini-3.6-flash";

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
        type: message.role === "user" ? "user_input" : "model_output",
        content: message.content,
      })),
      {
        type: "user_input",
        content: request.message,
      },
    ];

    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google request failed: ${error}`);
    }

    const data = await response.json();

    const output = data.steps
      ?.filter((step: { type?: string }) => step.type === "model_output")
      .flatMap(
        (step: {
          content?: Array<{ type?: string; text?: string }>;
        }) => step.content ?? [],
      )
      .filter((item: { type?: string }) => item.type === "text")
      .map((item: { text?: string }) => item.text ?? "")
      .join("") ?? "";

    return {
      provider: "google",
      model: GOOGLE_MODEL,
      content: output,
    };
  },
};