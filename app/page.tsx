"use client";

import { useState } from "react";
import ApiKeyManager from "./components/api-key-manager";
import ChatInput from "./components/chat-input";
import ProviderSelector from "./components/provider-selector";
import { openAIAdapter } from "../lib/ai/adapters/openai";
import { googleAdapter } from "../lib/ai/adapters/google";
import { runArena } from "../lib/ai/arena";
import type { AIMessage, AIProviderId, AIResponse } from "../lib/ai/types";

type ProviderHistory = Record<AIProviderId, AIMessage[]>;

export default function Home() {
  const [selectedProviders, setSelectedProviders] = useState<
    AIProviderId[]
  >(["openai", "google"]);

  const [history, setHistory] = useState<ProviderHistory>({
    openai: [],
    google: [],
  });

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
      const arenaResponses = await Promise.all(
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

      setResponses(arenaResponses);

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
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {responses.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2">
            {responses.map((response) => (
              <article
                key={response.provider}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">{response.provider}</h2>
                  <span className="text-xs text-zinc-400">
                    {response.model}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {response.content}
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}