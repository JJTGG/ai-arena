"use client";

import { useEffect, useState } from "react";
import { hasProviderKey } from "../../lib/ai/provider-status";

type Provider = "openai" | "google";

const PROVIDERS: {
  id: Provider;
  name: string;
}[] = [
  {
    id: "openai",
    name: "ChatGPT",
  },
  {
    id: "google",
    name: "Gemini",
  },
];

type ProviderSelectorProps = {
  selected: Provider[];
  onChange: (providers: Provider[]) => void;
};

export default function ProviderSelector({
  selected,
  onChange,
}: ProviderSelectorProps) {
  const [available, setAvailable] = useState<Record<Provider, boolean>>({
    openai: false,
    google: false,
  });

  useEffect(() => {
    setAvailable({
      openai: hasProviderKey("openai"),
      google: hasProviderKey("google"),
    });
  }, []);

  function toggleProvider(provider: Provider) {
    if (selected.includes(provider)) {
      onChange(selected.filter((item) => item !== provider));
      return;
    }

    onChange([...selected, provider]);
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="mb-3 text-sm font-medium text-zinc-700">
        Models
      </p>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => {
          const isSelected = selected.includes(provider.id);
          const hasKey = available[provider.id];

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
              <span className="block">{provider.name}</span>

              <span
                className={`mt-1 block text-xs ${
                  isSelected ? "text-zinc-300" : "text-zinc-400"
                }`}
              >
                {hasKey ? "API key ready" : "No API key"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}