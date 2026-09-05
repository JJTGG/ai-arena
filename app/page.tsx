"use client";

import { useEffect, useState } from "react";
import ApiKeyManager from "./components/api-key-manager";
import ChatInput from "./components/chat-input";
import ProviderSelector from "./components/provider-selector";
import { openAIAdapter } from "../lib/ai/adapters/openai";
import { googleAdapter } from "../lib/ai/adapters/google";
import { runArena } from "../lib/ai/arena";
import type { AIMessage, AIProviderId, AIResponse } from "../lib/ai/types";
import { recordUsage } from "../lib/ai/usage";
import ResponseCard from "./components/response-card";

type ProviderHistory = Record<AIProviderId, AIMessage[]>;

export default function Home() {
  const [selectedProviders, setSelectedProviders] = useState<AIProviderId[]>([
    "openai",
    "google",
  ]);

  const [history, setHistory] = useState<ProviderHistory>({
    openai: [],
    google: [],
  });

useEffect(() => {
  const storedHistory = sessionStorage.getItem("ai-arena-history");

  if (!storedHistory) {
    return;
  }

  try {
    setHistory(JSON.parse(storedHistory));
  } catch {
    sessionStorage.removeItem("ai-arena-history");
  }
}, []);

  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(message: string) {
    if (selectedProviders.length === 0 || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setResponses([]);

    const adapters = [openAIAdapter, googleAdapter].filter((adapter) =>
      selectedProviders.includes(adapter.provider.id),
    );

    const providerHistories = selectedProviders.reduce(
      (result, provider) => {
        result[provider] = history[provider];
        return result;
      },
      {} as ProviderHistory,
    );

    try {
      const results = await Promise.allSettled(
        adapters.map(async (adapter) => {
          const response = await runArena(
            {
              message,
              history: providerHistories[adapter.provider.id],
            },
            [adapter],
          );

          return response[0];
        }),
      );

      const arenaResponses: AIResponse[] = [];
      const failedProviders: string[] = [];

      results.forEach((result, index) => {
        const adapter = adapters[index];

        if (result.status === "fulfilled") {
          arenaResponses.push(result.value);
        } else {
          failedProviders.push(
            `${adapter.provider.name}: ${
              result.reason instanceof Error
                ? result.reason.message
                : "Request failed."
            }`,
          );
        }
      });

      if (arenaResponses.length === 0 && failedProviders.length > 0) {
        throw new Error(failedProviders.join("\n"));
      }

      if (failedProviders.length > 0) {
        setError(failedProviders.join("\n"));
      }

      setResponses(arenaResponses);

      recordUsage(
  arenaResponses.map((response) => response.provider),
);

      setHistory((currentHistory) => {
  const updatedHistory = { ...currentHistory };

  for (const response of arenaResponses) {
    updatedHistory[response.provider] = [
      ...currentHistory[response.provider],
      {
        role: "user",
        content: message,
      },
      {
        role: "assistant",
        content: response.content,
      },
    ];
  }

  sessionStorage.setItem(
    "ai-arena-history",
    JSON.stringify(updatedHistory),
  );

  return updatedHistory;
});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
  <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 sm:py-10">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
              Multi-model intelligence
            </p>

            <h1 className="font-[family-name:var(--font-display)] text-5xl uppercase leading-none tracking-wide text-[var(--foreground)] sm:text-6xl">
              AI Arena
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--foreground-muted)]">
              Put models head-to-head. Compare how they think, respond, and
              explain.
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
              V1.0.0
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--foreground-muted)]">
              BYOK MODE
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <ApiKeyManager />

          <ProviderSelector
            selected={selectedProviders}
            onChange={setSelectedProviders}
          />

          {selectedProviders.length === 0 && (
            <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--surface)] p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-[var(--danger)]">
                Arena locked
              </p>

              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                Select at least one model before entering the Arena.
              </p>
            </div>
          )}

          <ChatInput
            onSubmit={handleSubmit}
            disabled={loading || selectedProviders.length === 0}
          />
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)]">
              Arena output
            </p>

            <span className="h-px flex-1 bg-[var(--border)]" />

            {loading && (
  <div className="flex items-center gap-2">
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
      Arena active
    </span>

    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--cyan)]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--magenta)] [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lime)] [animation-delay:300ms]" />
    </span>
  </div>
)}
          </div>

          {error && (
            <div className="mb-4 whitespace-pre-wrap rounded-xl border border-[var(--danger)]/40 bg-[var(--surface)] p-4 font-mono text-xs leading-5 text-[var(--danger)]">
              {error}
            </div>
          )}

          {Object.values(history).every(
            (providerHistory) => providerHistory.length === 0,
          ) && !loading && (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center">
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide text-[var(--foreground-muted)]">
                  Enter the Arena
                </p>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--foreground-subtle)]">
                  Add your provider keys, select your models, and send your
                  first prompt.
                </p>
              </div>
            </div>
          )}

          {Object.values(history).some(
            (providerHistory) => providerHistory.length > 0,
          ) && (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedProviders.map((providerId) => {
  const providerHistory = history[providerId];

  if (!providerHistory || providerHistory.length === 0) {
    return null;
  }

  const providerResponse = responses.find(
    (response) => response.provider === providerId,
  );

  return (
    <ResponseCard
      key={providerId}
      providerId={providerId}
      model={providerResponse?.model ?? providerId}
      messages={providerHistory}
    />
  );
})}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setHistory({
                      openai: [],
                      google: [],
                    });

                    setResponses([]);
                    setError("");
                    sessionStorage.removeItem("ai-arena-history");
                  }}
                  disabled={loading}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </main>
);