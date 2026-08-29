import type { AIRequest, AIResponse, AIProvider } from "./types";

export interface AIProviderAdapter {
  provider: AIProvider;

  generate(request: AIRequest): Promise<AIResponse>;
}