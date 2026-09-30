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
    error instanceof Error
      ? error.message.toLowerCase()
      : "";

  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("api key")
  ) {
    return "The API key was rejected.";
  }

  if (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("credit") ||
    message.includes("insufficient")
  ) {
    return "The provider reported a quota or available-credit issue.";
  }

  return "The provider could not complete this round.";
}

export default function Home() {
  const [selectedProviders, setSelectedProviders] =
    useState<AIProviderId[]>([]);

  const [availableProviders, setAvailableProviders] =
    useState<Record<AIProviderId, boolean>>({
      openai: false,
      google: false,
    });

  const [history, setHistory] =
    useState<ProviderHistory>(
      EMPTY_HISTORY,
    );

  const [responses, setResponses] =
    useState<AIResponse[]>([]);

  const [providerErrors, setProviderErrors] =
    useState<
      Partial<Record<AIProviderId, string>>
    >({});

  const [providerRoundState, setProviderRoundState] =
    useState<
      Record<
        AIProviderId,
        ProviderRoundState
      >
    >(EMPTY_PROVIDER_STATE);

  const [roundState, setRoundState] =
    useState<RoundState>("idle");

  const [loading, setLoading] =
    useState(false);

  const [currentRound, setCurrentRound] =
    useState(0);

  const [nextRound, setNextRound] =
    useState(1);

  const [activePrompt, setActivePrompt] =
    useState("");

  useEffect(() => {
    const storedHistory =
      sessionStorage.getItem(
        "ai-arena-history",
      );

    const storedNextRound =
      sessionStorage.getItem(
        "ai-arena-next-round",
      );

    if (storedHistory) {
      try {
        const parsed =
          JSON.parse(
            storedHistory,
          ) as ProviderHistory;

        if (
          parsed &&
          Array.isArray(parsed.openai) &&
          Array.isArray(parsed.google)
        ) {
          setHistory(parsed);

          const completedRounds =
            Math.max(
              parsed.openai.filter(
                (message) =>
                  message.role === "user",
              ).length,
              parsed.google.filter(
                (message) =>
                  message.role === "user",
              ).length,
            );

          setCurrentRound(
            completedRounds,
          );
        } else {
          sessionStorage.removeItem(
            "ai-arena-history",
          );
        }
      } catch {
        sessionStorage.removeItem(
          "ai-arena-history",
        );
      }
    }

    if (storedNextRound) {
      const parsed =
        Number.parseInt(
          storedNextRound,
          10,
        );

      if (
        Number.isFinite(parsed) &&
        parsed > 0
      ) {
        setNextRound(parsed);
      }
    }
  }, []);

  async function handleSubmit(
    message: string,
  ) {
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
    setNextRound(
      roundNumber + 1,
    );
    setActivePrompt(message);
    setResponses([]);
    setProviderErrors({});

    sessionStorage.setItem(
      "ai-arena-next-round",
      String(roundNumber + 1),
    );

    const nextStates = {
      ...EMPTY_PROVIDER_STATE,
    };

    for (const provider of selectedProviders) {
      nextStates[provider] =
        "thinking";
    }

    setProviderRoundState(
      nextStates,
    );

    const adapters = [
      openAIAdapter,
      googleAdapter,
    ].filter((adapter) =>
      selectedProviders.includes(
        adapter.provider.id,
      ),
    );

    const providerHistories =
      selectedProviders.reduce(
        (result, provider) => {
          result[provider] =
            history[provider];

          return result;
        },
        {} as ProviderHistory,
      );

    const successfulResponses: AIResponse[] =
      [];

    const failedProviders: Partial<
      Record<AIProviderId, string>
    > = {};

    await Promise.all(
      adapters.map(
        async (adapter) => {
          const providerId =
            adapter.provider.id;

          try {
            const result =
              await runArena(
                {
                  message,
                  history:
                    providerHistories[
                      providerId
                    ],
                },
                [adapter],
              );

            const response =
              result[0];

            if (!response) {
              throw new Error(
                "Provider returned no response.",
              );
            }

            successfulResponses.push(
              response,
            );

            setResponses(
              (current) => [
                ...current,
                response,
              ],
            );

            setProviderRoundState(
              (current) => ({
                ...current,
                [providerId]:
                  "complete",
              }),
            );
          } catch (error) {
            const failure =
              getFailureMessage(
                error,
              );

            failedProviders[
              providerId
            ] = failure;

            setProviderErrors(
              (current) => ({
                ...current,
                [providerId]:
                  failure,
              }),
            );

            setProviderRoundState(
              (current) => ({
                ...current,
                [providerId]:
                  "failed",
              }),
            );
          }
        },
      ),
    );

    if (
      successfulResponses.length === 0
    ) {
      setRoundState("failed");
    } else if (
      successfulResponses.length <
      selectedProviders.length
    ) {
      setRoundState("partial");
    } else {
      setRoundState("complete");
    }

    if (
      successfulResponses.length > 0
    ) {
      recordUsage(
        successfulResponses.map(
          (response) =>
            response.provider,
        ),
      );
    }

    setHistory(
      (currentHistory) => {
        if (
          successfulResponses.length ===
          0
        ) {
          return currentHistory;
        }

        const updatedHistory = {
          ...currentHistory,
        };

        for (const response of successfulResponses) {
          updatedHistory[
            response.provider
          ] = [
            ...currentHistory[
              response.provider
            ],
            {
              role: "user",
              content: message,
            },
            {
              role: "assistant",
              content:
                response.content,
            },
          ];
        }

        sessionStorage.setItem(
          "ai-arena-history",
          JSON.stringify(
            updatedHistory,
          ),
        );

        return updatedHistory;
      },
    );

    setProviderErrors(
      failedProviders,
    );

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

    sessionStorage.removeItem(
      "ai-arena-history",
    );

    sessionStorage.removeItem(
      "ai-arena-next-round",
    );
  }

  const hasHistory =
    Object.values(history).some(
      (providerHistory) =>
        providerHistory.length > 0,
    );

  const connectedCount = useMemo(
    () =>
      Object.values(
        availableProviders,
      ).filter(Boolean).length,
    [availableProviders],
  );

  const lineupCount =
    selectedProviders.length;

  let arenaStatus = "NO ENTRANTS";

  if (roundState === "active") {
    arenaStatus = `ROUND ${formatRound(
      currentRound,
    )} · LIVE`;
  } else if (
    roundState === "partial"
  ) {
    arenaStatus = `ROUND ${formatRound(
      currentRound,
    )} · PARTIAL`;
  } else if (
    roundState === "failed"
  ) {
    arenaStatus = `ROUND ${formatRound(
      currentRound,
    )} · FAILED`;
  } else if (
    roundState === "complete"
  ) {
    arenaStatus = `ROUND ${formatRound(
      currentRound,
    )} · COMPLETE`;
  } else if (lineupCount === 1) {
    arenaStatus = "1 ENTRANT READY";
  } else if (lineupCount > 1) {
    arenaStatus = `${lineupCount} ENTRANTS READY`;
  } else if (connectedCount > 0) {
    arenaStatus = "LINEUP AVAILABLE";
  }

  const statusClass =
    roundState === "active"
      ? "arena-roundbar__state--active"
      : roundState === "complete"
        ? "arena-roundbar__state--complete"
        : roundState === "partial"
          ? "arena-roundbar__state--partial"
          : roundState === "failed"
            ? "arena-roundbar__state--failed"
            : "";

  const roundLabel = formatRound(
    currentRound > 0
      ? currentRound
      : nextRound,
  );

  return (
    <main className="arena-page">
      <div className="arena-shell">
        <header className="arena-header">
          <div className="arena-brand">
            <span className="arena-brand__signal" />

            <h1 className="arena-brand__name">
              AI Arena
            </h1>

            <span className="arena-brand__sub">
              One prompt · multiple minds
            </span>
          </div>

          <Link
            href="/guide"
            className="arena-guide"
          >
            Guide
          </Link>
        </header>

        <div className="arena-roundbar">
          <span className="arena-roundbar__round">
            Round {roundLabel}
          </span>

          <span
            className={`arena-roundbar__state ${statusClass}`}
          >
            {arenaStatus}
          </span>
        </div>

        <section className="arena-section arena-lineup">
          <div className="arena-section__label">
            <span>Lineup</span>

            <span className="arena-section__line" />

            <span className="arena-section__meta">
              {lineupCount}/2
            </span>
          </div>

          <ProviderSelector
            selected={
              selectedProviders
            }
            onChange={
              setSelectedProviders
            }
            onAvailabilityChange={
              setAvailableProviders
            }
          />
        </section>

        <section className="arena-prompt-stage">
          <div className="arena-prompt-heading">
            <div>
              <p className="arena-prompt-heading__eyebrow">
                Round {roundLabel}
              </p>

              <h2 className="arena-prompt-heading__title">
                Ask the Arena
              </h2>
            </div>

            <p className="arena-prompt-heading__note">
              Same prompt
              <br />
              Every entrant
            </p>
          </div>

          <ChatInput
            onSubmit={handleSubmit}
            roundNumber={
              currentRound > 0
                ? currentRound
                : nextRound
            }
            disabled={
              loading ||
              selectedProviders.length ===
                0
            }
          />
        </section>

        <section
          className={`arena-floor ${
            roundState === "active"
              ? "arena-floor--active"
              : ""
          }`}
        >
          <div className="arena-floor__bar">
            <span className="arena-floor__label">
              Arena floor
            </span>

            <span className="arena-floor__status">
              {arenaStatus}
            </span>
          </div>

          {!hasHistory &&
            roundState === "idle" && (
              <div className="arena-empty">
                <div className="arena-empty__content">
                  <div className="arena-empty__sigil">
                    <span className="arena-empty__core" />
                  </div>

                  <p className="arena-empty__eyebrow">
                    {lineupCount === 0
                      ? "Awaiting entrants"
                      : "Arena standing by"}
                  </p>

                  <h3 className="arena-empty__title">
                    {lineupCount === 0
                      ? "No round in progress"
                      : `Ready for Round ${roundLabel}`}
                  </h3>

                  <p className="arena-empty__text">
                    {lineupCount === 0
                      ? "Connect a provider and place an entrant in the lineup."
                      : "Write your prompt above. Entering the round activates the floor."}
                  </p>
                </div>
              </div>
            )}

          {(hasHistory ||
            loading ||
            roundState !== "idle") && (
            <div className="arena-result-grid">
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
          <footer className="arena-footer">
            <span className="arena-footer__meta">
              {hasHistory
                ? `${currentRound} ${
                    currentRound === 1
                      ? "round"
                      : "rounds"
                  } recorded`
                : "No completed rounds"}
            </span>

            <button
              type="button"
              onClick={clearArena}
              disabled={loading}
              className="arena-clear"
            >
              Clear Arena
            </button>
          </footer>
        )}
      </div>
    </main>
  );
}