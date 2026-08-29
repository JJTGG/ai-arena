export type StoredKeys = {
  openai: string | null;
  anthropic: string | null;
  google: string | null;
};

const STORAGE_KEYS = {
  openai: "ai-arena-openai-key",
  anthropic: "ai-arena-anthropic-key",
  google: "ai-arena-google-key",
} as const;

export function getStoredKeys(): StoredKeys {
  return {
    openai: localStorage.getItem(STORAGE_KEYS.openai),
    anthropic: localStorage.getItem(STORAGE_KEYS.anthropic),
    google: localStorage.getItem(STORAGE_KEYS.google),
  };
}