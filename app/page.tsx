"use client";

import { useState } from "react";
import ApiKeyManager from "./components/api-key-manager";
import ChatInput from "./components/chat-input";
import ProviderSelector from "./components/provider-selector";

type Provider = "openai" | "google";

export default function Home() {
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([
  "openai",
  "google",
]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center px-6 py-16">
        <div className="flex w-full flex-col items-center justify-center py-16 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            AI Arena
          </p>

          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
            One question.
            <br />
            Multiple AI minds.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Compare responses from different AI models in the same
            conversation.
          </p>

          <div className="mt-10 w-full max-w-2xl">
            <ProviderSelector
              selected={selectedProviders}
              onChange={setSelectedProviders}
            />
          </div>

          <div className="mt-6 w-full max-w-2xl">
            <ChatInput />
          </div>
        </div>

        <ApiKeyManager />
      </section>
    </main>
  );
}