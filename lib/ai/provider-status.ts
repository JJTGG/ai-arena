import type { AIProviderId } from "./types";

const STORAGE_KEYS: Record<AIProviderId, string> = {
  openai: "ai-arena-openai-key",
  anthropic: "ai-arena-anthropic-key",
  google: "ai-arena-google-key",
};

export function hasProviderKey(provider: AIProviderId): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEYS[provider]));
}