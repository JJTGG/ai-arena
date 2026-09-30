"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { openAIAdapter } from "../lib/ai/adapters/openai";
import { googleAdapter } from "../lib/ai/adapters/google";
import { runArena } from "../lib/ai/arena";
import type {
  AIMessage,
  AIProviderId,
  AIResponse,
} from "../lib/ai/types";
import { recordUsage } from "../lib/ai/usage";
import ProviderSelector from "./components/provider-selector";
import ChatInput from "./components/chat-input";
import ResponseCard from "./components/response-card";

type ProviderHistory = Record<AIProviderId, AIMessage[]>;

type RoundState =
  | "idle"
  | "active"
  | "complete"
  | "partial"
  | "failed";

type ProviderRoundState =
  | "idle"
  | "thinking"
  | "complete"
  | "failed";

const EMPTY_HISTORY: ProviderHistory = {
  openai: [],
  google: [],
};

const EMPTY_PROVIDER_STATE: Record<
  AIProviderId,
  ProviderRoundState
> = {
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
  const [selectedProviders, setSelectedProviders] = useState<
    AIProviderId[]
  >([]);

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

  const [roundState, setRoundState] =
    useState<RoundState>("idle");

  const [loading, setLoading] = useState(false);

  const [currentRound, setCurrentRound] = useState(0);
  const [nextRound, setNextRound] = useState(1);
  const [activePrompt, setActivePrompt] = useState("");

  useEffect(() => {
    const storedHistory =
      sessionStorage.getItem("ai-arena-history");

    const storedNextRound =
      sessionStorage.getItem("ai-arena-next-round");

    if (storedHistory) {
      try {
        const parsed =
          JSON.parse(storedHistory) as ProviderHistory;

        if (
          parsed &&
          Array.isArray(parsed.openai) &&
          Array.isArray(parsed.google)
        ) {
          setHistory(parsed);

          const completedRounds = Math.max(
            parsed.openai.filter(
              (message) => message.role === "user",
            ).length,
            parsed.google.filter(
              (message) => message.role === "user",
            ).length,
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
      const parsedNextRound = Number.parseInt(
        storedNextRound,
        10,
      );

      if (
        Number.isFinite(parsedNextRound) &&
        parsedNextRound > 0
      ) {
        setNextRound(parsedNextRound);
      }
    }
  }, []);

  async function handleSubmit(message: string) {
    if (
      selectedProviders.length === 0 ||
      loading
    ) {
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
    const failedProviders: Partial<
      Record<AIProviderId, string>
    > = {};

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
            throw new Error(
              "Provider returned no response.",
            );
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
          const failureMessage =
            getFailureMessage(error);

          failedProviders[providerId] =
            failureMessage;

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
      successfulResponses.length <
      selectedProviders.length
    ) {
      setRoundState("partial");
    } else {
      setRoundState("complete");
    }

    if (successfulResponses.length > 0) {
      recordUsage(
        successfulResponses.map(
          (response) => response.provider,
        ),
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

    setHistory({
      ...EMPTY_HISTORY,
    });

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
    sessionStorage.removeItem(
      "ai-arena-next-round",
    );
  }

  const hasHistory = Object.values(history).some(
    (providerHistory) =>
      providerHistory.length > 0,
  );

  const connectedCount = useMemo(
    () =>
      Object.values(availableProviders).filter(
        Boolean,
      ).length,
    [availableProviders],
  );

  const lineupCount = selectedProviders.length;

  let arenaStatus = "NO ENTRANTS";

  if (roundState === "active") {
    arenaStatus = `ROUND ${formatRound(currentRound)} · LIVE`;
  } else if (roundState === "partial") {
    arenaStatus = `ROUND ${formatRound(currentRound)} · PARTIAL`;
  } else if (roundState === "failed") {
    arenaStatus = `ROUND ${formatRound(currentRound)} · FAILED`;
  } else if (roundState === "complete") {
    arenaStatus = `ROUND ${formatRound(currentRound)} · COMPLETE`;
  } else if (lineupCount === 1) {
    arenaStatus = "1 ENTRANT READY";
  } else if (lineupCount > 1) {
    arenaStatus = `${lineupCount} ENTRANTS READY`;
  } else if (connectedCount > 0) {
    arenaStatus = "LINEUP AVAILABLE";
  }

  const roundLabel = formatRound(
    currentRound > 0
      ? currentRound
      : nextRound,
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="border-y border-[var(--border)] py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />

              <h1 className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-[0.08em] sm:text-3xl">
                AI Arena
              </h1>

              <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)] sm:inline">
                Multi-model workspace
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)] sm:inline">
                V1.0.0 · BYOK
              </span>

              <Link
                href="/guide"
                className="border border-[var(--border)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                Guide
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="lg:border-r lg:border-[var(--border)] lg:pr-6">
            <div className="sticky top-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                  Your lineup
                </p>

                <span className="font-mono text-[9px] tabular-nums text-[var(--foreground-subtle)]">
                  {lineupCount}/2
                </span>
              </div>

              <ProviderSelector
                selected={selectedProviders}
                onChange={setSelectedProviders}
                onAvailabilityChange={
                  setAvailableProviders
                }
              />

              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                  Arena status
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      roundState === "failed"
                        ? "bg-[var(--danger)]"
                        : roundState === "partial"
                          ? "bg-[var(--accent)]"
                          : roundState === "active"
                            ? "bg-[var(--cyan)] animate-pulse"
                            : roundState === "complete"
                              ? "bg-[var(--success)]"
                              : "bg-[var(--foreground-subtle)]"
                    }`}
                  />

                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                      roundState === "failed"
                        ? "text-[var(--danger)]"
                        : roundState === "partial"
                          ? "text-[var(--accent)]"
                          : roundState === "active"
                            ? "text-[var(--cyan)]"
                            : roundState === "complete"
                              ? "text-[var(--success)]"
                              : "text-[var(--foreground-muted)]"
                    }`}
                  >
                    {arenaStatus}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <section className="border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col border-b border-[var(--border)] px-5 py-5 sm:px-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--accent)]">
                      Round {roundLabel}
                    </p>

                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl uppercase leading-none tracking-wide sm:text-6xl">
                      Ask the Arena
                    </h2>
                  </div>

                  <span className="hidden font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--foreground-subtle)] sm:inline">
                    Same prompt · Every entrant
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <ChatInput
                  onSubmit={handleSubmit}
                  roundNumber={
                    currentRound > 0
                      ? currentRound
                      : nextRound
                  }
                  disabled={
                    loading ||
                    selectedProviders.length === 0
                  }
                />
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-center gap-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--foreground-subtle)]">
                  Arena floor
                </p>

                <span className="h-px flex-1 bg-[var(--border)]" />

                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
                  {arenaStatus}
                </span>
              </div>

              {!hasHistory &&
                roundState === "idle" && (
                  <div className="relative overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(245,165,36,0.06),transparent_45%)]" />

                    <div className="relative flex min-h-[22rem] flex-col items-center justify-center px-6 py-12 text-center">
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                        {connectedCount === 0
                          ? "Awaiting lineup"
                          : "Arena standing by"}
                      </span>

                      <div className="mt-5 flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            lineupCount > 0
                              ? "bg-[var(--success)]"
                              : "bg-[var(--foreground-subtle)]"
                          }`}
                        />

                        <span className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide sm:text-4xl">
                          {lineupCount > 0
                            ? `Ready for Round ${roundLabel}`
                            : "No entrants selected"}
                        </span>
                      </div>

                      <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--foreground-muted)]">
                        {lineupCount > 0
                          ? "Your lineup is standing by. The next prompt starts the round."
                          : "Connect a provider in the lineup, select an entrant, and the Arena becomes live."}
                      </p>

                      <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                        {selectedProviders.map(
                          (providerId, index) => (
                            <div
                              key={providerId}
                              className="border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-left"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                                  Entrant {index + 1}
                                </span>

                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    providerId === "google"
                                      ? "bg-[var(--magenta)]"
                                      : "bg-[var(--cyan)]"
                                  }`}
                                />
                              </div>

                              <p className="mt-2 font-[family-name:var(--font-display)] text-xl uppercase tracking-wide">
                                {providerId === "google"
                                  ? "Gemini"
                                  : "ChatGPT"}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {(hasHistory ||
                loading ||
                roundState !== "idle") && (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedProviders.map(
                    (providerId) => (
                      <ResponseCard
                        key={providerId}
                        providerId={providerId}
                        messages={
                          history[providerId]
                        }
                        latestResponse={responses.find(
                          (response) =>
                            response.provider ===
                            providerId,
                        )}
                        status={
                          providerRoundState[
                            providerId
                          ]
                        }
                        roundNumber={
                          currentRound
                        }
                        currentPrompt={
                          activePrompt
                        }
                        error={
                          providerErrors[
                            providerId
                          ]
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </section>

            {(hasHistory ||
              roundState !== "idle") && (
              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                  {hasHistory
                    ? `${currentRound} ${
                        currentRound === 1
                          ? "round"
                          : "rounds"
                      } recorded`
                    : "No completed rounds"}
                </p>

                <button
                  type="button"
                  onClick={clearArena}
                  disabled={loading}
                  className="border border-[var(--border)] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-40"
                >
                  Clear Arena
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}