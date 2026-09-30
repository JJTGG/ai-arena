"use client";

import { useEffect, useState } from "react";
import type { AIProviderId } from "../../lib/ai/types";

type Provider = AIProviderId;

const STORAGE_KEYS: Record<Provider, string> = {
  openai: "ai-arena-openai-key",
  google: "ai-arena-google-key",
};

const PROVIDERS: {
  id: Provider;
  name: string;
  description: string;
  accent: "cyan" | "magenta";
  keyUrl: string;
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
    description: "OpenAI API",
    accent: "cyan",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    name: "Gemini",
    description: "Google AI",
    accent: "magenta",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
];

type ProviderSelectorProps = {
  selected: Provider[];
  onChange: (providers: Provider[]) => void;
  onAvailabilityChange?: (
    providers: Record<Provider, boolean>,
  ) => void;
};

export default function ProviderSelector({
  selected,
  onChange,
  onAvailabilityChange,
}: ProviderSelectorProps) {
  const [available, setAvailable] = useState<Record<Provider, boolean>>({
    openai: false,
    google: false,
  });

  const [expanded, setExpanded] = useState<Provider | null>(null);

  const [keys, setKeys] = useState<Record<Provider, string>>({
    openai: "",
    google: "",
  });

  function readAvailability() {
    const next = {
      openai: Boolean(
        localStorage.getItem(STORAGE_KEYS.openai),
      ),
      google: Boolean(
        localStorage.getItem(STORAGE_KEYS.google),
      ),
    };

    setAvailable(next);
    onAvailabilityChange?.(next);

    return next;
  }

  useEffect(() => {
    const next = readAvailability();

    if (selected.length === 0) {
      const connectedProviders = PROVIDERS.filter(
        (provider) => next[provider.id],
      ).map((provider) => provider.id);

      if (connectedProviders.length > 0) {
        onChange(connectedProviders);
      }
    }
    // Selection is intentionally only auto-populated during initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelection(provider: Provider) {
    if (!available[provider]) {
      setExpanded(provider);
      return;
    }

    if (selected.includes(provider)) {
      onChange(
        selected.filter((item) => item !== provider),
      );
      return;
    }

    onChange([...selected, provider]);
  }

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

    const next = readAvailability();

    if (!selected.includes(provider)) {
      onChange([...selected, provider]);
    }

    setAvailable(next);
    setExpanded(null);
  }

  function removeKey(provider: Provider) {
    localStorage.removeItem(STORAGE_KEYS[provider]);

    setKeys((current) => ({
      ...current,
      [provider]: "",
    }));

    const next = readAvailability();

    setAvailable(next);

    if (selected.includes(provider)) {
      onChange(
        selected.filter((item) => item !== provider),
      );
    }

    setExpanded(null);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {PROVIDERS.map((provider) => {
        const isSelected = selected.includes(provider.id);
        const hasKey = available[provider.id];
        const isExpanded = expanded === provider.id;

        const accentClass =
          provider.accent === "cyan"
            ? "text-[var(--cyan)]"
            : "text-[var(--magenta)]";

        const borderClass =
          provider.accent === "cyan"
            ? "border-[var(--cyan)]/60"
            : "border-[var(--magenta)]/60";

        return (
          <article
            key={provider.id}
            className={`min-w-0 border bg-[var(--surface)] transition ${
              isSelected
                ? borderClass
                : "border-[var(--border)]"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleSelection(provider.id)}
              aria-pressed={isSelected}
              className="w-full p-5 text-left transition hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        provider.accent === "cyan"
                          ? "bg-[var(--cyan)]"
                          : "bg-[var(--magenta)]"
                      }`}
                    />

                    <h2 className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide">
                      {provider.name}
                    </h2>
                  </div>

                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                    {provider.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.15em] ${
                    hasKey
                      ? "text-[var(--success)]"
                      : "text-[var(--foreground-subtle)]"
                  }`}
                >
                  {hasKey ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
                    isSelected
                      ? accentClass
                      : "text-[var(--foreground-muted)]"
                  }`}
                >
                  {isSelected
                    ? "In lineup"
                    : hasKey
                      ? "Add to lineup"
                      : "Connect first"}
                </span>

                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
                  {isSelected ? "Selected" : "Select"}
                </span>
              </div>
            </button>

            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
              {hasKey ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(
                      isExpanded ? null : provider.id,
                    )
                  }
                  className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
                >
                  {isExpanded ? "Close connection" : "Manage key"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setExpanded(provider.id)}
                  className={`font-mono text-[9px] uppercase tracking-[0.16em] ${accentClass} transition hover:opacity-80`}
                >
                  Connect →
                </button>
              )}

              <a
                href={provider.keyUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--foreground-subtle)] transition hover:text-[var(--foreground)]"
              >
                Get API key ↗
              </a>
            </div>

            {isExpanded && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                  {hasKey
                    ? "Replace or remove the stored key"
                    : "Add your API key"}
                </p>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={keys[provider.id]}
                    onChange={(event) =>
                      setKeys((current) => ({
                        ...current,
                        [provider.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveKey(provider.id);
                      }
                    }}
                    placeholder={
                      hasKey
                        ? "Enter a replacement key"
                        : "Paste API key"
                    }
                    className="min-w-0 flex-1 border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]"
                  />

                  <button
                    type="button"
                    onClick={() => saveKey(provider.id)}
                    disabled={!keys[provider.id].trim()}
                    className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save key
                  </button>
                </div>

                {hasKey && (
                  <button
                    type="button"
                    onClick={() => removeKey(provider.id)}
                    className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--danger)] transition hover:opacity-80"
                  >
                    Remove key
                  </button>
                )}

                <p className="mt-4 text-xs leading-5 text-[var(--foreground-subtle)]">
                  AI Arena V1 stores this key in this browser and uses it
                  directly for provider requests. It is not uploaded to an
                  AI Arena account.
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}