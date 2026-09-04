"use client";

import { useState } from "react";
import type { AIMessage } from "../../lib/ai/types";

type ResponseCardProps = {
  providerId: string;
  model: string;
  messages: AIMessage[];
};

export default function ResponseCard({
  providerId,
  model,
  messages,
}: ResponseCardProps) {
  const [copied, setCopied] = useState(false);

  const latestResponse = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  async function handleCopy() {
    if (!latestResponse) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestResponse.content);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border-strong)]">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-30" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
              </span>

              <h2 className="font-[family-name:var(--font-display)] text-xl uppercase tracking-wide text-[var(--foreground)]">
                {providerId}
              </h2>
            </div>

            <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
              {model}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-md border border-[var(--border)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--foreground-subtle)] sm:inline-block">
              Live
            </span>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!latestResponse}
              className="rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--foreground-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {messages.map((message, index) => (
          <div
            key={`${providerId}-${index}`}
            className={
              message.role === "user"
                ? "rounded-xl border border-[var(--accent)]/20 bg-[var(--surface-raised)] p-4"
                : "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
            }
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p
                className={`font-mono text-[9px] font-medium uppercase tracking-[0.2em] ${
                  message.role === "user"
                    ? "text-[var(--accent)]"
                    : "text-[var(--foreground-subtle)]"
                }`}
              >
                {message.role === "user" ? "Your prompt" : "Model response"}
              </p>

              {message.role === "assistant" && (
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--success)]">
                  Complete
                </span>
              )}
            </div>

            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}