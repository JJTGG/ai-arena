"use client";

import type { AIProviderId, AIMessage } from "../../lib/ai/types";

interface ResponseCardProps {
  providerId: AIProviderId;
  model: string;
  messages: AIMessage[];
}

export default function ResponseCard({
  providerId,
  model,
  messages,
}: ResponseCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--background-card)] p-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide text-[var(--foreground)]">
            {providerId === "google" ? "Gemini" : "OpenAI"}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 ${
              message.role === "user"
                ? "bg-[var(--background-subtle)]"
                : "bg-[var(--background)]"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}