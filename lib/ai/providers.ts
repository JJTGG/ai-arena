import type { AIProvider } from "./types";

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    model: "gpt-5.6-luna",
  },
  {
    id: "google",
    name: "Google",
    model: "gemini-3.7-flash",
  },
];