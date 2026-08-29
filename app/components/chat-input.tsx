"use client";

import { useState } from "react";

const MAX_LENGTH = 4000;

export default function ChatInput() {
  const [message, setMessage] = useState("");

  const remaining = MAX_LENGTH - message.length;

  function handleSubmit() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    console.log("Arena prompt:", trimmedMessage);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="Ask anything..."
        className="min-h-32 w-full resize-none bg-transparent p-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
      />

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="px-3 text-sm text-zinc-400">
          {message.length} / {MAX_LENGTH}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enter Arena
        </button>
      </div>
    </div>
  );
}