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
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">AI Arena</h1>
          <p className="mt-2 text-zinc-500">
            Compare AI models side by side.
          </p>
        </header>

        <ApiKeyManager />

        <ProviderSelector
          selected={selectedProviders}
          onChange={setSelectedProviders}
        />

        {selectedProviders.length === 0 && (
          <p className="text-sm text-red-500">
            Select at least one model before entering the Arena.
          </p>
        )}

        <ChatInput
          onSubmit={handleSubmit}
          disabled={loading || selectedProviders.length === 0}
        />

        {error && (
          <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {selectedProviders.length > 0 && (
  <section className="grid gap-4 md:grid-cols-2">
    {selectedProviders.map((providerId) => {
      const providerHistory = history[providerId];

      if (!providerHistory || providerHistory.length === 0) {
        return null;
      }

      return (
        <article
          key={providerId}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 font-semibold capitalize">
            {providerId}
          </h2>

          <div className="space-y-4">
            {providerHistory.map((message, index) => (
              <div
                key={`${providerId}-${index}`}
                className={
                  message.role === "user"
                    ? "rounded-xl bg-zinc-100 p-3"
                    : "rounded-xl border border-zinc-200 p-3"
                }
              >
                <p className="mb-1 text-xs font-medium uppercase text-zinc-400">
                  {message.role === "user" ? "You" : providerId}
                </p>

                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        </article>
      );
    })}
  </section>
)}
      </div>
    </main>
  );
}