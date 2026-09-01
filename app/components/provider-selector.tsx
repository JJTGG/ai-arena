"use client";

import { useEffect, useState } from "react";
import { hasProviderKey } from "../../lib/ai/provider-status";

type Provider = "openai" | "google";

const PROVIDERS: {
  id: Provider;
  name: string;
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
  },
  {
    id: "google",
    name: "Gemini",
  },
];

type ProviderSelectorProps = {
  selected: Provider[];
  onChange: (providers: Provider[]) => void;
};

export default function ProviderSelector({
  selected,
  onChange,
}: ProviderSelectorProps) {
  const [available, setAvailable] = useState<Record<Provider, boolean>>({
    openai: false,
    google: false,
  });

  useEffect(() => {
    setAvailable({
      openai: hasProviderKey("openai"),
      google: hasProviderKey("google"),
    });
  }, []);

  function toggleProvider(provider: Provider) {
    if (selected.includes(provider)) {
      onChange(selected.filter((item) => item !== provider));
      return;
    }

    onChange([...selected, provider]);
  }

  return (
  <div className="w-full max-w-2xl">
    <div className="mb-3 flex items-center gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
        Select models
      </p>

      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>

    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map((provider) => {
        const isSelected = selected.includes(provider.id);
        const hasKey = available[provider.id];

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => toggleProvider(provider.id)}
            className={`rounded-xl border p-4 text-left transition ${
              isSelected
                ? "border-[var(--accent)] bg-[var(--surface-raised)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`font-mono text-sm font-medium ${
                  isSelected
                    ? "text-[var(--foreground)]"
                    : "text-[var(--foreground-muted)]"
                }`}
              >
                {provider.name}
              </span>

              <span
                className={`h-2 w-2 rounded-full ${
                  hasKey
                    ? "bg-[var(--success)]"
                    : "bg-[var(--foreground-subtle)]"
                }`}
              />
            </div>

            <span
              className={`mt-2 block font-mono text-[10px] uppercase tracking-wider ${
                hasKey
                  ? "text-[var(--success)]"
                  : "text-[var(--foreground-subtle)]"
              }`}
            >
              {hasKey ? "API key ready" : "No API key"}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);