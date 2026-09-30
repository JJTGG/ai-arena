"use client";

import {
  useState,
  type KeyboardEvent,
} from "react";

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
  const [message, setMessage] =
    useState("");

  function handleSubmit() {
    const trimmed =
      message.trim();

    if (!trimmed || disabled) {
      return;
    }

    onSubmit(trimmed);
    setMessage("");
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
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
    <div className="arena-prompt">
      <div className="arena-prompt__meta">
        <span className="arena-prompt__meta-label">
          Round{" "}
          {String(
            roundNumber,
          ).padStart(2, "0")}
        </span>

        <span className="arena-prompt__count">
          {message.length} /{" "}
          {MAX_LENGTH}
        </span>
      </div>

      <textarea
        value={message}
        onChange={(event) =>
          setMessage(
            event.target.value,
          )
        }
        onKeyDown={
          handleKeyDown
        }
        maxLength={MAX_LENGTH}
        disabled={disabled}
        placeholder="Give every entrant the same question..."
        className="arena-prompt__textarea"
        aria-label="Arena prompt"
      />

      <div className="arena-prompt__footer">
        <span className="arena-prompt__hint">
          Shift + Enter · New line
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            disabled ||
            !message.trim()
          }
          className="arena-enter"
        >
          {disabled
            ? "Round active"
            : "Enter Arena →"}
        </button>
      </div>
    </div>
  );
}