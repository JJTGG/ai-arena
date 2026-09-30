"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { openAIAdapter } from "../lib/ai/adapters/openai";
import { googleAdapter } from "../lib/ai/adapters/google";
import { runArena } from "../lib/ai/arena";
import type { AIMessage, AIProviderId, AIResponse } from "../lib/ai/types";
import { recordUsage } from "../lib/ai/usage";
import ProviderSelector from "./components/provider-selector";
import ChatInput from "./components/chat-input";
import ResponseCard from "./components/response-card";

type ProviderHistory = Record<AIProviderId, AIMessage[]>;

type RoundState = "idle" | "active" | "complete" | "partial" | "failed";

type ProviderRoundState =
  | "idle"
  | "thinking"
  | "complete"
  | "failed";

const EMPTY_HISTORY: ProviderHistory = {
  openai: [],
  google: [],
};

const EMPTY_PROVIDER_STATE: Record<AIProviderId, ProviderRoundState> = {
  openai: "idle",
  google: "idle",
};

function formatRound(round: number) {
  return String(round).padStart(2, "0");
}

function getFailureMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("api key")
  ) {
    return "The API key was rejected. Check the key and provider account.";
  }

  if (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("credit") ||
    message.includes("insufficient")
  ) {
    return "The provider reported a quota, limit, or available-credit issue.";
  }

  return "The provider could not complete this round.";
}

export default function Home() {
  const [selectedProviders, setSelectedProviders] = useState<AIProviderId[]>(
    [],
  );

  const [availableProviders, setAvailableProviders] = useState<
    Record<AIProviderId, boolean>
  >({
    openai: false,
    google: false,
  });

  const [history, setHistory] =
    useState<ProviderHistory>(EMPTY_HISTORY);

  const [responses, setResponses] = useState<AIResponse[]>([]);

  const [providerErrors, setProviderErrors] = useState<
    Partial<Record<AIProviderId, string>>
  >({});

  const [providerRoundState, setProviderRoundState] =
    useState<Record<AIProviderId, ProviderRoundState>>(
      EMPTY_PROVIDER_STATE,
    );

  const [roundState, setRoundState] = useState<RoundState>("idle");
  const [loading, setLoading] = useState(false);

  const [currentRound, setCurrentRound] = useState(0);
  const [nextRound, setNextRound] = useState(1);
  const [activePrompt, setActivePrompt] = useState("");

  useEffect(() => {
    const storedHistory = sessionStorage.getItem("ai-arena-history");
    const storedNextRound = sessionStorage.getItem("ai-arena-next-round");

    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as ProviderHistory;

        if (
          parsed &&
          Array.isArray(parsed.openai) &&
          Array.isArray(parsed.google)
        ) {
          setHistory(parsed);

          const completedRounds = Math.max(
            parsed.openai.filter((message) => message.role === "user")
              .length,
            parsed.google.filter((message) => message.role === "user")
              .length,
          );

          setCurrentRound(completedRounds);
        } else {
          sessionStorage.removeItem("ai-arena-history");
        }
      } catch {
        sessionStorage.removeItem("ai-arena-history");
      }
    }

    if (storedNextRound) {
      const parsedNextRound = Number.parseInt(storedNextRound, 10);

      if (Number.isFinite(parsedNextRound) && parsedNextRound > 0) {
        setNextRound(parsedNextRound);
      }
    }
  }, []);

  async function handleSubmit(message: string) {
    if (selectedProviders.length === 0 || loading) {
      return;
    }

    const roundNumber = nextRound;

    setLoading(true);
    setRoundState("active");
    setCurrentRound(roundNumber);
    setNextRound(roundNumber + 1);
    setActivePrompt(message);
    setResponses([]);
    setProviderErrors({});

    sessionStorage.setItem(
      "ai-arena-next-round",
      String(roundNumber + 1),
    );

    const nextProviderState = {
      ...EMPTY_PROVIDER_STATE,
    };

    for (const provider of selectedProviders) {
      nextProviderState[provider] = "thinking";
    }

    setProviderRoundState(nextProviderState);

    const adapters = [
      openAIAdapter,
      googleAdapter,
    ].filter((adapter) =>
      selectedProviders.includes(adapter.provider.id),
    );

    const providerHistories = selectedProviders.reduce(
      (result, provider) => {
        result[provider] = history[provider];
        return result;
      },
      {} as ProviderHistory,
    );

    const successfulResponses: AIResponse[] = [];
    const failedProviders: Partial<Record<AIProviderId, string>> = {};

    await Promise.all(
      adapters.map(async (adapter) => {
        const providerId = adapter.provider.id;

        try {
          const result = await runArena(
            {
              message,
              history: providerHistories[providerId],
            },
            [adapter],
          );

          const response = result[0];

          if (!response) {
            throw new Error("Provider returned no response.");
          }

          successfulResponses.push(response);

          setResponses((current) => [
            ...current,
            response,
          ]);

          setProviderRoundState((current) => ({
            ...current,
            [providerId]: "complete",
          }));
        } catch (error) {
          const failureMessage = getFailureMessage(error);

          failedProviders[providerId] = failureMessage;

          setProviderErrors((current) => ({
            ...current,
            [providerId]: failureMessage,
          }));

          setProviderRoundState((current) => ({
            ...current,
            [providerId]: "failed",
          }));
        }
      }),
    );

    if (successfulResponses.length === 0) {
      setRoundState("failed");
    } else if (
      successfulResponses.length < selectedProviders.length
    ) {
      setRoundState("partial");
    } else {
      setRoundState("complete");
    }

    if (successfulResponses.length > 0) {
      recordUsage(
        successfulResponses.map((response) => response.provider),
      );
    }

    setHistory((currentHistory) => {
      if (successfulResponses.length === 0) {
        return currentHistory;
      }

      const updatedHistory = {
        ...currentHistory,
      };

      for (const response of successfulResponses) {
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

    setProviderErrors(failedProviders);
    setLoading(false);
  }

  function clearArena() {
    if (loading) {
      return;
    }

    const resetHistory = {
      ...EMPTY_HISTORY,
    };

    setHistory(resetHistory);
    setResponses([]);
    setProviderErrors({});
    setProviderRoundState({
      ...EMPTY_PROVIDER_STATE,
    });
    setRoundState("idle");
    setCurrentRound(0);
    setNextRound(1);
    setActivePrompt("");

    sessionStorage.removeItem("ai-arena-history");
    sessionStorage.removeItem("ai-arena-next-round");
  }

  const hasHistory = Object.values(history).some(
    (providerHistory) => providerHistory.length > 0,
  );

  const hasAvailableProvider = Object.values(
    availableProviders,
  ).some(Boolean);

  let statusLabel = "BUILD YOUR LINEUP";

  if (roundState === "active") {
    statusLabel = `ROUND ${formatRound(currentRound)} · LIVE`;
  } else if (roundState === "partial") {
    statusLabel = `ROUND ${formatRound(currentRound)} · PARTIAL`;
  } else if (roundState === "failed") {
    statusLabel = `ROUND ${formatRound(currentRound)} · FAILED`;
  } else if (roundState === "complete") {
    statusLabel = `ROUND ${formatRound(currentRound)} · COMPLETE`;
  } else if (selectedProviders.length > 0) {
    statusLabel = `${selectedProviders.length} ${
      selectedProviders.length === 1 ? "ENTRANT" : "ENTRANTS"
    } READY`;
  } else if (hasAvailableProvider) {
    statusLabel = "CHOOSE YOUR ENTRANTS";
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="border-b border-[var(--border)] pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
                  Multi-model workspace
                </p>

                <span className="h-1 w-1 rounded-full bg-[var(--foreground-subtle)]" />

                <Link
                  href="/guide"
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
                >
                  Guide
                </Link>
              </div>

              <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl uppercase leading-none tracking-wide sm:text-6xl">
                AI Arena
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--foreground-muted)]">
                One prompt. Multiple AI minds. Compare the round.
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

        <section>
          <div className="mb-3 flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)]">
              Lineup
            </p>

            <span className="h-px flex-1 bg-[var(--border)]" />

            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
              {selectedProviders.length}{" "}
              {selectedProviders.length === 1
                ? "entrant"
                : "entrants"}{" "}
              selected
            </p>
          </div>

          <ProviderSelector
            selected={selectedProviders}
            onChange={setSelectedProviders}
            onAvailabilityChange={setAvailableProviders}
          />

          {!hasAvailableProvider && (
            <div className="mt-4 border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    New to BYOK?
                  </p>

                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                    The Guide explains API keys, provider setup, and how
                    Arena uses them.
                  </p>
                </div>

                <Link
                  href="/guide"
                  className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                >
                  Read the Guide →
                </Link>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)]">
              Round {formatRound(currentRound > 0 ? currentRound : nextRound)}
            </p>

            <span className="h-px flex-1 bg-[var(--border)]" />

            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
              {loading ? "Arena live" : "Prompt control"}
            </p>
          </div>

          <ChatInput
            onSubmit={handleSubmit}
            roundNumber={currentRound > 0 ? currentRound : nextRound}
            disabled={
              loading ||
              selectedProviders.length === 0
            }
          />

          {selectedProviders.length === 0 && !loading && (
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
              Select at least one connected entrant to begin.
            </p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)]">
              Arena
            </p>

            <span className="h-px flex-1 bg-[var(--border)]" />

            <span
              className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                roundState === "failed"
                  ? "text-[var(--danger)]"
                  : roundState === "partial"
                    ? "text-[var(--accent)]"
                    : roundState === "active"
                      ? "text-[var(--cyan)]"
                      : roundState === "complete"
                        ? "text-[var(--success)]"
                        : "text-[var(--foreground-subtle)]"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          {!hasHistory &&
            !loading &&
            roundState === "idle" && (
              <div className="border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex min-h-[280px] items-center justify-center px-6 py-12 text-center sm:px-10">
                  <div className="max-w-lg">
                    <p className="font-[family-name:var(--font-display)] text-4xl uppercase tracking-wide sm:text-5xl">
                      {selectedProviders.length === 0
                        ? "Build Your Lineup"
                        : "Ready for the Round"}
                    </p>

                    <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--foreground-muted)]">
                      {selectedProviders.length === 0
                        ? "Connect a provider, add it to the lineup, and the Arena is ready."
                        : `Your ${
                            selectedProviders.length === 1
                              ? "entrant is"
                              : "entrants are"
                          } ready for Round ${formatRound(nextRound)}.`}
                    </p>

                    {selectedProviders.length === 0 && (
                      <Link
                        href="/guide"
                        className="mt-6 inline-flex border border-[var(--border-strong)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                      >
                        Learn BYOK →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

          {(hasHistory ||
            loading ||
            roundState !== "idle") && (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedProviders.map((providerId) => (
                <ResponseCard
                  key={providerId}
                  providerId={providerId}
                  messages={history[providerId]}
                  latestResponse={responses.find(
                    (response) =>
                      response.provider === providerId,
                  )}
                  status={providerRoundState[providerId]}
                  roundNumber={currentRound}
                  currentPrompt={activePrompt}
                  error={providerErrors[providerId]}
                />
              ))}
            </div>
          )}

          {(hasHistory || roundState !== "idle") && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={clearArena}
                disabled={loading}
                className="border border-[var(--border)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--foreground-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Arena
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}