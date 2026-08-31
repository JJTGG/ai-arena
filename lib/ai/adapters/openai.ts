import type { AIProviderAdapter } from "../provider";
import type { AIRequest, AIResponse } from "../types";

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
        role: "user",
        content: request.message,
      },
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI request failed: ${error}`);
    }

    const data = await response.json();

    return {
      provider: "openai",
      model: OPENAI_MODEL,
      content: data.output_text ?? "",
    };
  },
};