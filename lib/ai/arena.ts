import { AI_PROVIDERS } from "./providers";
import type { AIRequest, AIResponse } from "./types";
import type { AIProviderAdapter } from "./provider";

export async function runArena(
  request: AIRequest,
  adapters: AIProviderAdapter[],
): Promise<AIResponse[]> {
  const availableAdapters = AI_PROVIDERS
    .map((provider) =>
      adapters.find((adapter) => adapter.provider.id === provider.id),
    )
    .filter((adapter): adapter is AIProviderAdapter => Boolean(adapter));

  const responses = await Promise.all(
    availableAdapters.map((adapter) => adapter.generate(request)),
  );

  return responses;
}