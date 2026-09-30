"use client";

import type {
  AIMessage,
  AIProviderId,
  AIResponse,
} from "../../lib/ai/types";

type ProviderRoundState =
  | "idle"
  | "thinking"
  | "complete"
  | "failed";

interface ResponseCardProps {
  providerId: AIProviderId;
  messages: AIMessage[];
  latestResponse?: AIResponse;
  status: ProviderRoundState;
  roundNumber: number;
  currentPrompt: string;
  error?: string;
}

function getProviderMeta(providerId: AIProviderId) {
  if (providerId === "google") {
    return {
      name: "Gemini",
      accent: "magenta" as const,
      accentText: "text-[var(--magenta)]",
      accentBg: "bg-[var(--magenta)]",
      accentBorder: "border-[var(--magenta)]/60",
    };
  }

  return {
    name: "ChatGPT",
    accent: "cyan" as const,
    accentText: "text-[var(--cyan)]",
    accentBg: "bg-[var(--cyan)]",
    accentBorder: "border-[var(--cyan)]/60",
  };
}

function getLastMessage(
  messages: AIMessage[],
  role: AIMessage["role"],
) {
  return [...messages]
    .reverse()
    .find((message) => message.role === role);
}

export default function ResponseCard({
  providerId,
  messages,
  latestResponse,
  status,
  roundNumber,
  currentPrompt,
  error,
}: ResponseCardProps) {
  const provider = getProviderMeta(providerId);

  const lastHistoricalPrompt = getLastMessage(
    messages,
    "user",
  );

  const lastHistoricalResponse = getLastMessage(
    messages,
    "assistant",
  );

  const displayedPrompt =
    status === "idle"
      ? lastHistoricalPrompt?.content
      : currentPrompt || lastHistoricalPrompt?.content;

  const displayedResponse =
    latestResponse?.content ??
    lastHistoricalResponse?.content;

  const olderMessages =
    messages.length > 2
      ? messages.slice(0, -2)
      : [];

  return (
    <section
      className={`min-w-0 overflow-hidden border bg-[var(--surface)] ${
        status === "complete"
          ? provider.accentBorder
          : "border-[var(--border)]"
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                status === "thinking"
                  ? `${provider.accentBg} animate-pulse`
                  : status === "failed"
                    ? "bg-[var(--danger)]"
                    : provider.accentBg
              }`}
            />

            <h2 className="truncate font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide">
              {provider.name}
            </h2>
          </div>

          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
            Entrant
          </p>
        </div>

        <span
          className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] ${
            status === "thinking"
              ? provider.accentText
              : status === "complete"
                ? "text-[var(--success)]"
                : status === "failed"
                  ? "text-[var(--danger)]"
                  : "text-[var(--foreground-subtle)]"
          }`}
        >
          {status === "thinking"
            ? "Thinking"
            : status === "complete"
              ? "Complete"
              : status === "failed"
                ? "Failed"
                : messages.length > 0
                  ? "Last result"
                  : "Ready"}
        </span>
      </header>

      <div className="p-5">
        {status === "thinking" && (
          <div className="space-y-3">
            <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                Round {String(roundNumber).padStart(2, "0")}
              </p>

              <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                Waiting for {provider.name} to complete the round.
              </p>

              <div className="mt-5 flex gap-1.5">
                <span
                  className={`h-1.5 w-10 animate-pulse rounded-full ${provider.accentBg}`}
                />
                <span
                  className={`h-1.5 w-16 animate-pulse rounded-full ${provider.accentBg} [animation-delay:120ms]`}
                />
                <span
                  className={`h-1.5 w-6 animate-pulse rounded-full ${provider.accentBg} [animation-delay:240ms]`}
                />
              </div>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-4">
            {displayedPrompt && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                  Prompt
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                  {displayedPrompt}
                </p>
              </div>
            )}

            <div className="border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--danger)]">
                Round failed
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                {error ?? `${provider.name} could not complete this round.`}
              </p>
            </div>

            {lastHistoricalResponse && (
              <div className="border-t border-[var(--border)] pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                  Last response
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                  {lastHistoricalResponse.content}
                </p>
              </div>
            )}
          </div>
        )}

        {status === "complete" && latestResponse && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                Round {String(roundNumber).padStart(2, "0")} · Prompt
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                {displayedPrompt}
              </p>
            </div>

            <div className="border-t border-[var(--border)] pt-5">
              <p className={`font-mono text-[9px] uppercase tracking-[0.16em] ${provider.accentText}`}>
                Response
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                {latestResponse.content}
              </p>
            </div>
          </div>
        )}

        {status === "idle" && displayedResponse && (
          <div className="space-y-5">
            {displayedPrompt && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                  Last prompt
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                  {displayedPrompt}
                </p>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-5">
              <p className={`font-mono text-[9px] uppercase tracking-[0.16em] ${provider.accentText}`}>
                Response
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                {displayedResponse}
              </p>
            </div>
          </div>
        )}

        {status === "idle" &&
          !displayedResponse && (
            <div className="flex min-h-40 items-center justify-center border border-dashed border-[var(--border)] px-5 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                Awaiting first round
              </p>
            </div>
          )}

        {olderMessages.length > 0 && (
          <details className="mt-5 border-t border-[var(--border)] pt-4">
            <summary className="cursor-pointer list-none font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]">
              View earlier exchanges
            </summary>

            <div className="mt-4 space-y-4">
              {olderMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className="border-l border-[var(--border-strong)] pl-4"
                >
                  <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--foreground-subtle)]">
                    {message.role === "user"
                      ? "Prompt"
                      : provider.name}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground-muted)]">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}