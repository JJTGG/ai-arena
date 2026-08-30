"use client";

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

type ProviderSelectorProps = {
  selected: Provider[];
  onChange: (providers: Provider[]) => void;
};

export default function ProviderSelector({
  selected,
  onChange,
}: ProviderSelectorProps) {
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