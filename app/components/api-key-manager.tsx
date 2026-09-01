"use client";

import { useEffect, useState } from "react";

type Provider = "openai" | "google";

const STORAGE_KEYS: Record<Provider, string> = {
  openai: "ai-arena-openai-key",
  google: "ai-arena-google-key",
};

const PROVIDERS: {
  id: Provider;
  name: string;
  description: string;
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
    description: "OpenAI API key",
  },
  {
    id: "google",
    name: "Gemini",
    description: "Google AI API key",
  },
];

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<Record<Provider, string>>({
    openai: "",
    google: "",
  });

  const [saved, setSaved] = useState<Record<Provider, boolean>>({
    openai: false,
    google: false,
  });

  useEffect(() => {
    const storedStatus = {} as Record<Provider, boolean>;

    for (const provider of PROVIDERS) {
      storedStatus[provider.id] = Boolean(
        localStorage.getItem(STORAGE_KEYS[provider.id]),
      );
    }

    setSaved(storedStatus);
  }, []);

  function saveKey(provider: Provider) {
    const key = keys[provider].trim();

    if (!key) {
      return;
    }

    localStorage.setItem(STORAGE_KEYS[provider], key);

    setKeys((current) => ({
      ...current,
      [provider]: "",
    }));

    setSaved((current) => ({
      ...current,
      [provider]: true,
    }));
  }

  function removeKey(provider: Provider) {
    localStorage.removeItem(STORAGE_KEYS[provider]);

    setKeys((current) => ({
      ...current,
      [provider]: "",
    }));

    setSaved((current) => ({
      ...current,
      [provider]: false,
    }));
  }

  return (
  <section className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left">
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
          BYOK
        </span>

        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide text-[var(--foreground)]">
        Your API Keys
      </h2>

      <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
        Your keys stay in this browser and are used only for your requests.
      </p>
    </div>

    <div className="mt-6 space-y-5">
      {PROVIDERS.map((provider) => (
        <div
          key={provider.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-medium text-[var(--foreground)]">
                {provider.name}
              </p>

              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                {provider.description}
              </p>
            </div>

            {saved[provider.id] && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--success)]">
                Key saved
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={keys[provider.id]}
              onChange={(event) =>
                setKeys((current) => ({
                  ...current,
                  [provider.id]: event.target.value,
                }))
              }
              placeholder={
                saved[provider.id]
                  ? "Key saved"
                  : `Enter ${provider.name} API key`
              }
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-xs text-[var(--foreground)] outline-none transition placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]"
            />

            <button
              type="button"
              onClick={() => saveKey(provider.id)}
              className="rounded-lg bg-[var(--accent)] px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
            >
              Save
            </button>

            {saved[provider.id] && (
              <button
                type="button"
                onClick={() => removeKey(provider.id)}
                className="rounded-lg border border-[var(--border)] px-4 py-3 font-mono text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>

    <p className="mt-5 border-t border-[var(--border)] pt-4 font-mono text-[10px] leading-5 text-[var(--foreground-subtle)]">
      Only use your own API keys. Anyone with access to this browser profile
      may be able to access stored keys.
    </p>
  </section>
);