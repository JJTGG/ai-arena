"use client";

import { useState } from "react";

type Provider = "openai" | "anthropic" | "google";

const PROVIDERS: {
  id: Provider;
  name: string;
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
  },
  {
    id: "anthropic",
    name: "Claude",
  },
  {
    id: "google",
    name: "Gemini",
  },
];

export default function ProviderSelector() {
  const [selected, setSelected] = useState<Provider[]>([
    "openai",
    "anthropic",
    "google",
  ]);

  function toggleProvider(provider: Provider) {
    setSelected((current) =>
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider],
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-3 text-sm font-medium text-zinc-700">
        Models
      </p>

      <div className="grid grid-cols-3 gap-3">
        {PROVIDERS.map((provider) => {
          const isSelected = selected.includes(provider.id);

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => toggleProvider(provider.id)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                isSelected
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {provider.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}