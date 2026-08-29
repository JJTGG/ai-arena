"use client";

import { useEffect, useState } from "react";

type Provider = "openai" | "anthropic" | "google";

const STORAGE_KEYS: Record<Provider, string> = {
  openai: "ai-arena-openai-key",
  anthropic: "ai-arena-anthropic-key",
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
    id: "anthropic",
    name: "Claude",
    description: "Anthropic API key",
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
    anthropic: "",
    google: "",
  });

  const [saved, setSaved] = useState<Record<Provider, boolean>>({
    openai: false,
    anthropic: false,
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
    <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">
          Your API keys
        </h2>

        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Your keys are stored only in this browser.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {PROVIDERS.map((provider) => (
          <div key={provider.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {provider.name}
                </p>

                <p className="text-xs text-zinc-500">
                  {provider.description}
                </p>
              </div>

              {saved[provider.id] && (
                <span className="text-xs font-medium text-zinc-500">
                  Saved
                </span>
              )}
            </div>

            <div className="flex gap-2">
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
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
              />

              <button
                type="button"
                onClick={() => saveKey(provider.id)}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Save
              </button>

              {saved[provider.id] && (
                <button
                  type="button"
                  onClick={() => removeKey(provider.id)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs leading-5 text-zinc-400">
        Only use your own API keys. Anyone with access to this browser profile
        may be able to access stored keys.
      </p>
    </section>
  );
}