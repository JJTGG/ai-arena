"use client";

import type { AIProviderId, AIMessage } from "../../lib/ai/types";

interface ResponseCardProps {
  providerId: AIProviderId;
  model: string;
  messages: AIMessage[];
}

export default function ResponseCard({
  providerId,
  messages,
}: ResponseCardProps) {
  const providerName = providerId === "google" ? "Gemini" : "ChatGPT";

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />

            <h3 className="truncate font-[family-name:var(--font-display)] text-xl uppercase tracking-wide text-[var(--foreground)]">
              {providerName}
            </h3>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
          Response
        </span>
      </header>

      <div className="flex flex-col gap-4 p-5">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-xl border p-4 ${
              message.role === "user"
                ? "border-[var(--border)] bg-[var(--surface-raised)]"
                : "border-[var(--border)] bg-[var(--background)]"
            }`}
          >
            <div className="mb-2 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
              {message.role === "user" ? "Prompt" : providerName}
            </div>

            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}