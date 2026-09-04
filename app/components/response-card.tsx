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
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />

            <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-wide text-[var(--foreground)]">
              {providerId}
            </h2>
          </div>

          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
            {model}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!latestResponse}
          className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--foreground-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "Copied" : "Copy"}
        </button>
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
            <p
              className={`mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.2em] ${
                message.role === "user"
                  ? "text-[var(--accent)]"
                  : "text-[var(--foreground-subtle)]"
              }`}
            >
              {message.role === "user" ? "You" : "Response"}
            </p>

            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}