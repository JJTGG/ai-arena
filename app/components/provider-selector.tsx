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
  shortName: string;
  accent: "cyan" | "magenta";
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
    shortName: "GPT",
    accent: "cyan",
  },
  {
    id: "google",
    name: "Gemini",
    shortName: "GEM",
    accent: "magenta",
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
  const [available, setAvailable] = useState<
    Record<Provider, boolean>
  >({
    openai: false,
    google: false,
  });

  const [expanded, setExpanded] =
    useState<Provider | null>(null);

  const [keys, setKeys] = useState<
    Record<Provider, string>
  >({
    openai: "",
    google: "",
  });

  function readAvailability() {
    const next = {
      openai: Boolean(
        localStorage.getItem(
          STORAGE_KEYS.openai,
        ),
      ),
      google: Boolean(
        localStorage.getItem(
          STORAGE_KEYS.google,
        ),
      ),
    };

    setAvailable(next);
    onAvailabilityChange?.(next);

    return next;
  }

  useEffect(() => {
    const next = readAvailability();

    if (selected.length === 0) {
      const connectedProviders =
        PROVIDERS.filter(
          (provider) => next[provider.id],
        ).map((provider) => provider.id);

      if (connectedProviders.length > 0) {
        onChange(connectedProviders);
      }
    }

    // Initial hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelection(
    provider: Provider,
  ) {
    if (!available[provider]) {
      setExpanded(provider);
      return;
    }

    if (selected.includes(provider)) {
      onChange(
        selected.filter(
          (item) => item !== provider,
        ),
      );

      return;
    }

    onChange([
      ...selected,
      provider,
    ]);
  }

  function saveKey(provider: Provider) {
    const key = keys[provider].trim();

    if (!key) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEYS[provider],
      key,
    );

    setKeys((current) => ({
      ...current,
      [provider]: "",
    }));

    const next = readAvailability();

    setAvailable(next);

    if (!selected.includes(provider)) {
      onChange([
        ...selected,
        provider,
      ]);
    }

    setExpanded(null);
  }

  function removeKey(provider: Provider) {
    localStorage.removeItem(
      STORAGE_KEYS[provider],
    );

    setKeys((current) => ({
      ...current,
      [provider]: "",
    }));

    const next = readAvailability();

    setAvailable(next);

    if (selected.includes(provider)) {
      onChange(
        selected.filter(
          (item) => item !== provider,
        ),
      );
    }

    setExpanded(null);
  }

  return (
    <div className="flex gap-2 lg:flex-col">
      {PROVIDERS.map((provider) => {
        const isSelected =
          selected.includes(provider.id);

        const hasKey =
          available[provider.id];

        const isExpanded =
          expanded === provider.id;

        const accent =
          provider.accent === "cyan"
            ? "var(--cyan)"
            : "var(--magenta)";

        const accentText =
          provider.accent === "cyan"
            ? "text-[var(--cyan)]"
            : "text-[var(--magenta)]";

        return (
          <div
            key={provider.id}
            className={`min-w-0 flex-1 border bg-[var(--surface)] transition lg:flex-none ${
              isSelected
                ? provider.accent === "cyan"
                  ? "border-[var(--cyan)]/60"
                  : "border-[var(--magenta)]/60"
                : "border-[var(--border)]"
            }`}
          >
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                toggleSelection(
                  provider.id,
                )
              }
              className="group w-full p-4 text-left hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          accent,
                      }}
                    />

                    <span className="truncate font-[family-name:var(--font-display)] text-lg uppercase tracking-wide">
                      {provider.name}
                    </span>
                  </div>

                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--foreground-subtle)]">
                    {hasKey
                      ? "Connected"
                      : "Needs connection"}
                  </p>
                </div>

                <span
                  className={`font-mono text-[8px] uppercase tracking-[0.14em] ${
                    isSelected
                      ? accentText
                      : "text-[var(--foreground-subtle)]"
                  }`}
                >
                  {isSelected
                    ? "IN"
                    : hasKey
                      ? "ADD"
                      : "CONNECT"}
                </span>
              </div>
            </button>

            <div className="border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() =>
                  setExpanded(
                    isExpanded
                      ? null
                      : provider.id,
                  )
                }
                className="w-full px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--foreground-subtle)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground-muted)]"
              >
                {isExpanded
                  ? "Close"
                  : hasKey
                    ? "Manage key"
                    : "Connect"}
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-4">
                  <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--foreground-subtle)]">
                    {hasKey
                      ? `Manage ${provider.name} key`
                      : `Connect ${provider.name}`}
                  </p>

                  <div className="mt-3">
                    <input
                      type="password"
                      value={
                        keys[provider.id]
                      }
                      onChange={(event) =>
                        setKeys(
                          (current) => ({
                            ...current,
                            [provider.id]:
                              event.target.value,
                          }),
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          saveKey(
                            provider.id,
                          );
                        }
                      }}
                      placeholder={
                        hasKey
                          ? "Replacement key"
                          : "Paste API key"
                      }
                      aria-label={`${provider.name} API key`}
                      className="w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        saveKey(
                          provider.id,
                        )
                      }
                      disabled={
                        !keys[
                          provider.id
                        ].trim()
                      }
                      className="mt-2 w-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-2.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
                    >
                      Save key
                    </button>
                  </div>

                  {hasKey && (
                    <button
                      type="button"
                      onClick={() =>
                        removeKey(
                          provider.id,
                        )
                      }
                      className="mt-3 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--danger)] hover:opacity-80"
                    >
                      Remove key
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}