"use client";

import { useState } from "react";

const MAX_LENGTH = 4000;

type ChatInputProps = {
  onSubmit: (message: string) => void;
  disabled?: boolean;
};

export default function ChatInput({
  onSubmit,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  function handleSubmit() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return;
    }

    onSubmit(trimmedMessage);
    setMessage("");
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition focus-within:border-[var(--accent)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
          Arena Prompt
        </span>

        <span className="font-mono text-[10px] text-[var(--foreground-subtle)]">
          {message.length} / {MAX_LENGTH}
        </span>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_LENGTH}
        placeholder="Ask the Arena..."
        disabled={disabled}
        className="min-h-32 w-full resize-none bg-transparent px-4 py-4 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
          Shift + Enter for new line
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "Running..." : "Enter Arena"}
        </button>
      </div>
    </div>
  );
}