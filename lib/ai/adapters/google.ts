import type { AIProviderAdapter } from "../provider";
import type { AIRequest, AIResponse } from "../types";

const GOOGLE_MODEL = "gemini-2.5-flash";

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

    const contents = [
      ...request.history.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      {
        role: "user",
        parts: [{ text: request.message }],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google request failed: ${error}`);
    }

    const data = await response.json();

    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("") ?? "";

    return {
      provider: "google",
      model: GOOGLE_MODEL,
      content,
    };
  },
};