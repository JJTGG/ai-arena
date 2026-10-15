
"use client";

import Link from "next/link";
import { useState } from "react";
import type { KeyboardEvent } from "react";

import styles from "./arena.module.css";

type InitialUsage = {
  totalRoundsRemaining: number;
  dailyRoundsRemaining: number;
  completedRounds: number;
  totalRounds: number;
  dailyLimit: number;
  expiresAt: string;
};

type RoundDetails = {
  id: string;
  prompt: string;
  status: string;
  reservedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  releasedAt: string | null;
  failureCode: string | null;
};

type EntrantResult = {
  slot: number;
  label: string;
  status: string;
  response: string | null;
  latencyMs: number | null;
  errorCode: string | null;
};

type RoundUsage = {
  totalRoundsRemaining: number;
  dailyRoundsRemaining: number;
  totalRounds: number;
  dailyLimit: number;
  completedRounds: number;
};

type RoundApiResponse = {
  ok: boolean;
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };
  round?: RoundDetails;
  entrants?: EntrantResult[];
  usage?: RoundUsage | null;
};

type LatestRound = {
  round: RoundDetails;
  entrants: EntrantResult[];
};

function createRequestKey() {
  const randomId =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `hosted-round-${randomId}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRoundStatus(status: string) {
  const labels: Record<string, string> = {
    reserved: "Reserved",
    running: "In progress",
    completed: "Completed",
    retryable: "Retry available",
    failed: "Failed",
    released: "Released · allowance returned",
  };

  return labels[status] ?? "Status unavailable";
}

function entrantStatusClass(status: string) {
  switch (status) {
    case "completed":
      return styles.statusSuccess;

    case "failed":
      return styles.statusDanger;

    case "retryable":
      return styles.statusWarning;

    case "running":
      return styles.statusRunning;

    default:
      return styles.statusNeutral;
  }
}

function getFailureMessage(code: string | null) {
  switch (code) {
    case "PROVIDER_RATE_LIMITED":
      return "A hosted entrant reached a temporary service limit.";

    case "PROVIDER_TIMEOUT":
      return "An entrant did not respond before the time limit.";

    case "PROVIDER_UNAVAILABLE":
      return "A hosted response service is temporarily unavailable.";

    case "PROVIDER_CONFIGURATION_ERROR":
      return "The hosted response service is not ready to process this round.";

    case "PROVIDER_REJECTED":
      return "The hosted response service rejected the request.";

    case "DAILY_LIMIT_REACHED":
      return "Today's round allowance has been reached.";

    case "NO_ROUNDS_AVAILABLE":
      return "No round allowance remains.";

    case "ENTITLEMENT_EXPIRED":
      return "Your Hosted Arena access has expired.";

    default:
      return "The round could not be completed. Check the entrant results below.";
  }
}

function getEntrantFailureMessage(code: string | null) {
  switch (code) {
    case "PROVIDER_RATE_LIMITED":
      return "This entrant encountered a temporary service limit.";

    case "PROVIDER_TIMEOUT":
      return "This entrant timed out before completing its response.";

    case "PROVIDER_UNAVAILABLE":
      return "The response service for this entrant is temporarily unavailable.";

    case "PROVIDER_CONFIGURATION_ERROR":
      return "The response service for this entrant is not configured.";

    case "PROVIDER_REJECTED":
      return "The response service rejected this request.";

    default:
      return "This entrant could not complete its response.";
  }
}

export default function HostedArenaClient({
  initialUsage,
}: {
  initialUsage: InitialUsage;
}) {
  const [usage, setUsage] = useState(initialUsage);
  const [prompt, setPrompt] = useState("");
  const [latestRound, setLatestRound] =
    useState<LatestRound | null>(null);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const noRoundsRemaining =
    usage.totalRoundsRemaining <= 0;

  const noDailyAllowance =
    usage.dailyRoundsRemaining <= 0;

  const allowanceBlocked =
    noRoundsRemaining || noDailyAllowance;

  const trimmedPrompt = prompt.trim();

  async function handleRunRound() {
    if (
      submitting ||
      !trimmedPrompt ||
      (allowanceBlocked && requestKey === null)
    ) {
      return;
    }

    const idempotencyKey =
      requestKey ?? createRequestKey();

    setRequestKey(idempotencyKey);
    setSubmitting(true);
    setError("");

    try {
      let response: Response;

      try {
        response = await fetch("/api/hosted/rounds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            idempotencyKey,
          }),
        });
      } catch {
        setError(
          "The connection was interrupted before a result arrived. Retry this same request to avoid creating a duplicate round.",
        );
        return;
      }

      let payload: RoundApiResponse;

      try {
        payload =
          (await response.json()) as RoundApiResponse;
      } catch {
        setError(
          `Hosted Arena returned an unreadable response (HTTP ${response.status}). Retry this same request if the problem was temporary.`,
        );
        return;
      }

      if (
        !response.ok ||
        payload.ok !== true ||
        !payload.round
      ) {
        setError(
          payload.error?.message ??
            `Hosted Arena could not start the round (HTTP ${response.status}).`,
        );

        // Keep the same identifier only when the server says
        // the operation may be retried.
        if (
          response.status < 500 &&
          !payload.error?.retryable
        ) {
          setRequestKey(null);
        }

        return;
      }

      const round = payload.round;

      setLatestRound({
        round,
        entrants: Array.isArray(payload.entrants)
          ? payload.entrants
          : [],
      });

      const responseUsage = payload.usage;

      if (responseUsage) {
        setUsage((current) => ({
          ...current,
          totalRoundsRemaining:
            responseUsage.totalRoundsRemaining,
          dailyRoundsRemaining:
            responseUsage.dailyRoundsRemaining,
          completedRounds:
            responseUsage.completedRounds,
          totalRounds:
            responseUsage.totalRounds,
          dailyLimit:
            responseUsage.dailyLimit,
        }));
      }

      if (
        round.status === "retryable" ||
        round.status === "running" ||
        round.status === "reserved"
      ) {
        // Continue the existing reservation on the next request.
        setRequestKey(idempotencyKey);

        if (round.status === "retryable") {
          setError(
            "This round has a retryable result. Retry the same round to continue it without creating a new reservation.",
          );
        } else {
          setError(
            "The server has not reported a terminal result yet. Retry this same request to check the existing round.",
          );
        }
      } else {
        // Completed and terminally released rounds no longer
        // need the same request identifier.
        setRequestKey(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function updatePrompt(value: string) {
    setPrompt(value);
    setError("");
    setRequestKey(null);
  }

  function handlePromptKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      void handleRunRound();
    }
  }

  const hasPendingRequest = requestKey !== null;

  const retryLocked =
    hasPendingRequest && !submitting;

  const showRoundFailure =
    latestRound !== null &&
    (
      latestRound.round.status === "failed" ||
      latestRound.round.status === "released" ||
      Boolean(latestRound.round.failureCode)
    );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/hosted" className={styles.brand}>
            <span className={styles.brandMark}>AA</span>

            <span className={styles.brandCopy}>
              <strong>AI ARENA</strong>
              <small>HOSTED V0</small>
            </span>
          </Link>

          <nav className={styles.nav}>
            <Link href="/hosted">Access</Link>
            <Link href="/arena">BYOK Arena</Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              HOSTED SYSTEM / BATTLE SURFACE
            </p>

            <h1 className={styles.title}>
              Enter the
              <span>arena.</span>
            </h1>

            <p className={styles.lead}>
              One prompt. Two hosted entrants. Compare the
              responses without managing provider API keys.
            </p>
          </div>

          <div className={styles.heroMeta}>
            <span className={styles.liveDot} />

            <div>
              <strong>HOSTED SESSION</strong>
              <span>Access-controlled</span>
            </div>
          </div>
        </section>

        <section className={styles.usage} aria-label="Hosted allowance">
          <article className={styles.usageCard}>
            <span className={styles.usageLabel}>
              ROUNDS REMAINING
            </span>

            <strong className={styles.usageValue}>
              {usage.totalRoundsRemaining}
              <span> / {usage.totalRounds}</span>
            </strong>

            <div className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{
                  width: `${
                    usage.totalRounds > 0
                      ? Math.min(
                          100,
                          (usage.totalRoundsRemaining /
                            usage.totalRounds) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </article>

          <article className={styles.usageCard}>
            <span className={styles.usageLabel}>
              DAILY ALLOWANCE
            </span>

            <strong className={styles.usageValue}>
              {usage.dailyRoundsRemaining}
              <span> / {usage.dailyLimit}</span>
            </strong>

            <p className={styles.usageNote}>
              Available today
            </p>
          </article>

          <article className={styles.usageCard}>
            <span className={styles.usageLabel}>
              COMPLETED
            </span>

            <strong className={styles.usageValue}>
              {usage.completedRounds}
              <span> rounds</span>
            </strong>

            <p className={styles.usageNote}>
              Recorded by Hosted Arena
            </p>
          </article>

          <article className={styles.usageCard}>
            <span className={styles.usageLabel}>
              ACCESS ENDS
            </span>

            <strong className={styles.expiryValue}>
              {formatDate(usage.expiresAt)}
            </strong>

            <p className={styles.usageNote}>
              Current entitlement
            </p>
          </article>
        </section>

        <section className={styles.composer}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>NEW ROUND</p>
              <h2>Ask the Arena</h2>
            </div>

            <span className={styles.sectionMeta}>
              2 ENTRANTS / SAME PROMPT
            </span>
          </div>

          <label
            htmlFor="hosted-prompt"
            className={styles.promptLabel}
          >
            Your question or instruction
          </label>

          <textarea
            id="hosted-prompt"
            className={styles.promptInput}
            value={prompt}
            onChange={(event) =>
              updatePrompt(event.currentTarget.value)
            }
            onKeyDown={handlePromptKeyDown}
            placeholder="Give both entrants the same task..."
            maxLength={20_000}
            rows={7}
            disabled={submitting || hasPendingRequest}
          />

          <div className={styles.composerFooter}>
            <span className={styles.characterCount}>
              {prompt.length.toLocaleString("en-US")} / 20,000
            </span>

            <span className={styles.keyboardHint}>
              Ctrl / ⌘ + Enter to run
            </span>
          </div>

          {retryLocked && (
            <p className={styles.allowanceMessage} role="status">
              The prompt is locked to this request until the
              server returns a terminal result. Retry the same
              round rather than starting another reservation.
            </p>
          )}

          {allowanceBlocked && !hasPendingRequest && (
            <p className={styles.allowanceMessage} role="status">
              {noRoundsRemaining
                ? "Your total round allowance has been used."
                : "Your daily round allowance has been used."}
            </p>
          )}

          {error && (
            <div className={styles.errorBox} role="alert">
              <strong>Round request update</strong>
              <p>{error}</p>

              {hasPendingRequest && (
                <span>
                  The same request identifier is preserved.
                  Retrying will not create a second reservation
                  for this prompt.
                </span>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <p className={styles.runNote}>
              Starting a round is subject to your remaining
              allowance and Hosted Arena access.
            </p>

            <button
              type="button"
              className={styles.runButton}
              onClick={() => void handleRunRound()}
              disabled={
                submitting ||
                !trimmedPrompt ||
                (allowanceBlocked && !hasPendingRequest)
              }
            >
              {submitting
                ? "Running round..."
                : hasPendingRequest
                  ? "Retry same round →"
                  : allowanceBlocked
                    ? "Allowance unavailable"
                    : "Enter Arena →"}
            </button>
          </div>
        </section>

        <section className={styles.battle}>
          <div className={styles.battleHeading}>
            <div>
              <p className={styles.eyebrow}>RESULTS</p>
              <h2>Arena floor</h2>
            </div>

            {latestRound && (
              <span
                className={`${styles.roundStatus} ${
                  latestRound.round.status === "completed"
                    ? styles.statusSuccess
                    : latestRound.round.status === "failed"
                      ? styles.statusDanger
                      : latestRound.round.status === "retryable"
                        ? styles.statusWarning
                        : styles.statusNeutral
                }`}
              >
                {formatRoundStatus(latestRound.round.status)}
              </span>
            )}
          </div>

          {submitting && (
            <div className={styles.loadingPanel} role="status">
              <span className={styles.loadingSignal} />

              <div>
                <strong>Round in progress</strong>
                <p>
                  The hosted service is processing the request.
                  Keep this page open until the result arrives.
                </p>
              </div>
            </div>
          )}

          {!latestRound && !submitting && (
            <div className={styles.emptyPanel}>
              <span className={styles.emptyMark}>AA</span>
              <h3>Your next round starts here.</h3>

              <p>
                Submit one prompt to receive results from both
                hosted entrants. Responses are shown independently,
                so one entrant&apos;s failure does not hide the
                other entrant&apos;s result.
              </p>
            </div>
          )}

          {latestRound && (
            <div aria-live="polite">
              <div className={styles.promptSummary}>
                <span>SUBMITTED PROMPT</span>
                <p>{latestRound.round.prompt}</p>
              </div>

              {showRoundFailure && (
                <div className={styles.roundFailure}>
                  {getFailureMessage(
                    latestRound.round.failureCode,
                  )}
                </div>
              )}

              <div className={styles.entrantGrid}>
                {latestRound.entrants.map((entrant) => (
                  <article
                    className={styles.entrantCard}
                    key={`${latestRound.round.id}-${entrant.slot}`}
                  >
                    <header className={styles.entrantHeader}>
                      <div className={styles.entrantIdentity}>
                        <span
                          className={`${styles.entrantMark} ${
                            entrant.slot === 1
                              ? styles.entrantMarkOne
                              : styles.entrantMarkTwo
                          }`}
                        >
                          {String(entrant.slot).padStart(2, "0")}
                        </span>

                        <div>
                          <h3>
                            {entrant.label ||
                              `Entrant ${String(
                                entrant.slot,
                              ).padStart(2, "0")}`}
                          </h3>

                          <span>HOSTED ENTRANT</span>
                        </div>
                      </div>

                      <span
                        className={`${styles.entrantStatus} ${entrantStatusClass(
                          entrant.status,
                        )}`}
                      >
                        {formatRoundStatus(entrant.status)}
                      </span>
                    </header>

                    <div className={styles.entrantBody}>
                      {entrant.response ? (
                        <div className={styles.responseContent}>
                          <span className={styles.responseLabel}>
                            RESPONSE
                          </span>

                          <p>{entrant.response}</p>
                        </div>
                      ) : (
                        <div className={styles.entrantFailure}>
                          <span className={styles.responseLabel}>
                            RESULT
                          </span>

                          <p>
                            {entrant.status === "completed"
                              ? "The entrant completed, but no response text was returned."
                              : getEntrantFailureMessage(
                                  entrant.errorCode,
                                )}
                          </p>
                        </div>
                      )}
                    </div>

                    <footer className={styles.entrantFooter}>
                      <span>
                        {entrant.latencyMs !== null
                          ? `${Math.max(
                              0,
                              Math.round(entrant.latencyMs),
                            ).toLocaleString("en-US")} ms`
                          : "Latency unavailable"}
                      </span>

                      <span>
                        SLOT {String(entrant.slot).padStart(2, "0")}
                      </span>
                    </footer>
                  </article>
                ))}

                {latestRound.entrants.length === 0 && (
                  <p className={styles.noEntrants}>
                    No entrant result details were returned for
                    this round.
                  </p>
                )}
              </div>

              <div className={styles.resultFooter}>
                <span>
                  ROUND ID: {latestRound.round.id}
                </span>

                <button
                  type="button"
                  className={styles.clearResult}
                  onClick={() => {
                    if (!hasPendingRequest) {
                      setLatestRound(null);
                      setError("");
                    }
                  }}
                  disabled={hasPendingRequest}
                >
                  Clear result
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <span>AI ARENA / HOSTED V0</span>

          <span>
            <Link href="/hosted">Access and account</Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
