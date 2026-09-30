"use client";

import { useState } from "react";

const MAX_LENGTH = 4000;

type ChatInputProps = {
  onSubmit: (message: string) => void;
  roundNumber: number;
  disabled?: boolean;
};

export default function ChatInput({
  onSubmit,
  roundNumber,
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
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border border-[var(--border-strong)] bg-[var(--surface)] transition focus-within:border-[var(--accent)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
            Round {String(roundNumber).padStart(2, "0")}
          </p>

          <p className="mt-1 font-[family-name:var(--font-display)] text-xl uppercase tracking-wide">
            Put them to the test
          </p>
        </div>

        <span className="font-mono text-[9px] text-[var(--foreground-subtle)]">
          {message.length} / {MAX_LENGTH}
        </span>
      </div>

      <textarea
        value={message}
        onChange={(event) =>
          setMessage(event.target.value)
        }
        onKeyDown={handleKeyDown}
        maxLength={MAX_LENGTH}
        placeholder="Ask the same question to everyone in your lineup..."
        disabled={disabled}
        className="min-h-40 w-full resize-none bg-transparent px-4 py-5 text-sm leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-48"
      />

      <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
          Shift + Enter for new line
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            !message.trim() ||
            disabled
          }
          className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "Round active" : "Enter Arena →"}
        </button>
      </div>
    </div>
  );
}