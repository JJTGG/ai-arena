import type { AIProvider } from "./types";

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    model: "gpt-5",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    model: "claude-sonnet",
  },
  {
    id: "google",
    name: "Google",
    model: "gemini",
  },
];