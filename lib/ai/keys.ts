export type StoredKeys = {
  openai: string | null;
  google: string | null;
};

const STORAGE_KEYS = {
  openai: "ai-arena-openai-key",
  google: "ai-arena-google-key",
} as const;

export function getStoredKeys(): StoredKeys {
  return {
    openai: localStorage.getItem(STORAGE_KEYS.openai),
    google: localStorage.getItem(STORAGE_KEYS.google),
  };
}