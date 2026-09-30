"use client";

import {
  useEffect,
  useState,
} from "react";
import type { AIProviderId } from "../../lib/ai/types";

type Provider = AIProviderId;

const STORAGE_KEYS: Record<
  Provider,
  string
> = {
  openai: "ai-arena-openai-key",
  google: "ai-arena-google-key",
};

const PROVIDERS: {
  id: Provider;
  name: string;
  accent: "cyan" | "magenta";
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
    accent: "cyan",
  },
  {
    id: "google",
    name: "Gemini",
    accent: "magenta",
  },
];

type ProviderSelectorProps = {
  selected: Provider[];
  onChange: (
    providers: Provider[],
  ) => void;
  onAvailabilityChange?: (
    providers: Record<
      Provider,
      boolean
    >,
  ) => void;
};

export default function ProviderSelector({
  selected,
  onChange,
  onAvailabilityChange,
}: ProviderSelectorProps) {
  const [available, setAvailable] =
    useState<
      Record<Provider, boolean>
    >({
      openai: false,
      google: false,
    });

  const [expanded, setExpanded] =
    useState<Provider | null>(
      null,
    );

  const [keys, setKeys] =
    useState<
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
    const next =
      readAvailability();

    if (selected.length === 0) {
      const connected =
        PROVIDERS.filter(
          (provider) =>
            next[provider.id],
        ).map(
          (provider) =>
            provider.id,
        );

      if (connected.length > 0) {
        onChange(connected);
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

    if (
      selected.includes(provider)
    ) {
      onChange(
        selected.filter(
          (item) =>
            item !== provider,
        ),
      );

      return;
    }

    onChange([
      ...selected,
      provider,
    ]);
  }

  function saveKey(
    provider: Provider,
  ) {
    const key =
      keys[provider].trim();

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

    const next =
      readAvailability();

    setAvailable(next);

    if (
      !selected.includes(provider)
    ) {
      onChange([
        ...selected,
        provider,
      ]);
    }

    setExpanded(null);
  }

  function removeKey(
    provider: Provider,
  ) {
    localStorage.removeItem(
      STORAGE_KEYS[provider],
    );

    setKeys((current) => ({
      ...current,
      [provider]: "",
    }));

    const next =
      readAvailability();

    setAvailable(next);

    if (
      selected.includes(provider)
    ) {
      onChange(
        selected.filter(
          (item) =>
            item !== provider,
        ),
      );
    }

    setExpanded(null);
  }

  return (
    <div className="arena-provider-grid">
      {PROVIDERS.map(
        (provider) => {
          const isSelected =
            selected.includes(
              provider.id,
            );

          const hasKey =
            available[
              provider.id
            ];

          const isExpanded =
            expanded ===
            provider.id;

          return (
            <article
              key={provider.id}
              className={`arena-provider-slot arena-provider-slot--${provider.accent} ${
                isSelected
                  ? "arena-provider-slot--selected"
                  : ""
              }`}
            >
              <button
                type="button"
                aria-pressed={
                  isSelected
                }
                onClick={() =>
                  toggleSelection(
                    provider.id,
                  )
                }
                className="arena-provider-slot__button"
              >
                <div className="arena-provider-slot__top">
                  <div className="arena-provider-slot__identity">
                    <div className="arena-provider-slot__name">
                      <span className="arena-provider-slot__dot" />

                      <span>
                        {provider.name}
                      </span>
                    </div>

                    <p className="arena-provider-slot__status">
                      {hasKey
                        ? "Connected"
                        : "Needs connection"}
                    </p>
                  </div>

                  <span
                    className={`arena-provider-slot__state ${
                      hasKey
                        ? "arena-provider-slot__state--ready"
                        : ""
                    }`}
                  >
                    {hasKey
                      ? "READY"
                      : "CONNECT"}
                  </span>
                </div>

                <div className="arena-provider-slot__selection">
                  <span>
                    {isSelected
                      ? "In lineup"
                      : hasKey
                        ? "Available"
                        : "Not available"}
                  </span>

                  <strong>
                    {isSelected
                      ? "SELECTED"
                      : hasKey
                        ? "ADD"
                        : "OPEN"}
                  </strong>
                </div>
              </button>

              <div className="arena-provider-slot__actions">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(
                      isExpanded
                        ? null
                        : provider.id,
                    )
                  }
                  className="arena-provider-slot__action"
                >
                  {isExpanded
                    ? "Close"
                    : hasKey
                      ? "Manage key"
                      : "Connect"}
                </button>

                {hasKey && (
                  <button
                    type="button"
                    onClick={() =>
                      removeKey(
                        provider.id,
                      )
                    }
                    className="arena-provider-slot__action"
                  >
                    Remove
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="arena-provider-slot__connection">
                  <p className="arena-provider-slot__connection-label">
                    {hasKey
                      ? `Replace ${provider.name} key`
                      : `Connect ${provider.name}`}
                  </p>

                  <div className="arena-provider-slot__connection-row">
                    <input
                      type="password"
                      value={
                        keys[
                          provider.id
                        ]
                      }
                      onChange={(
                        event,
                      ) =>
                        setKeys(
                          (current) => ({
                            ...current,
                            [provider.id]:
                              event.target
                                .value,
                          }),
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
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
                      className="arena-provider-slot__input"
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
                      className="arena-provider-slot__save"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        },
      )}
    </div>
  );
}