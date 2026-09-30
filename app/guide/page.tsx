import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide · AI Arena",
  description:
    "Learn how BYOK works and how to connect AI providers to AI Arena.",
};

const providers = [
  {
    name: "ChatGPT",
    description: "OpenAI API",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    name: "Gemini",
    description: "Google AI",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-[var(--border)] pb-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
            >
              ← Back to Arena
            </Link>

            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
              BYOK GUIDE
            </span>
          </div>

          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            Start here
          </p>

          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl uppercase leading-none tracking-wide sm:text-7xl">
            How AI Arena Works
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--foreground-muted)]">
            Bring your own API key, choose your lineup, ask one question,
            and compare the responses.
          </p>
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-10">
            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                01 · What is BYOK?
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                Bring Your Own Key
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--foreground-muted)]">
                <p>
                  BYOK means Bring Your Own Key. AI Arena does not provide
                  shared provider credits. Instead, you connect your own API
                  access and the selected provider handles your request.
                </p>

                <p>
                  Your provider account is therefore still responsible for
                  whatever access, quota, billing, or usage limits apply to
                  your API account.
                </p>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                02 · Choose a provider
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                Start with your own access
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => (
                  <div
                    key={provider.name}
                    className="border border-[var(--border)] bg-[var(--surface)] p-5"
                  >
                    <p className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide">
                      {provider.name}
                    </p>

                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                      {provider.description}
                    </p>

                    <a
                      href={provider.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-block font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                    >
                      Open key management ↗
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                03 · Get your API key
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                Create or copy a key
              </h2>

              <div className="mt-5 space-y-5">
                <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                    OpenAI
                  </p>

                  <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground-muted)]">
                    <li>1. Sign in to the OpenAI API platform.</li>
                    <li>2. Open the API keys area.</li>
                    <li>3. Create a key for the project you intend to use.</li>
                    <li>4. Copy the key and keep it private.</li>
                  </ol>
                </div>

                <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--foreground-subtle)]">
                    Gemini
                  </p>

                  <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground-muted)]">
                    <li>1. Sign in to Google AI Studio.</li>
                    <li>2. Open the API keys area.</li>
                    <li>3. Create or select the key you want to use.</li>
                    <li>4. Copy the key and keep it private.</li>
                  </ol>
                </div>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                04 · Connect it
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                Add the key to your lineup
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--foreground-muted)]">
                <p>
                  Return to AI Arena and open the provider slot you want to
                  connect. Paste your API key, save it, and the provider becomes
                  available for your lineup.
                </p>

                <p>
                  You can connect one provider or both. You do not need two
                  entrants to use the Arena.
                </p>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                05 · Enter the Arena
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                One prompt. One round.
              </h2>

              <div className="mt-5 border border-[var(--border)] bg-[var(--surface)]">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    Example
                  </p>

                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    “Explain the trade-offs of building a system this way.”
                  </p>
                </div>

                <div className="grid md:grid-cols-2">
                  <div className="border-b border-[var(--border)] p-5 md:border-b-0 md:border-r">
                    <p className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide">
                      ChatGPT
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                      Response from your OpenAI API access.
                    </p>
                  </div>

                  <div className="p-5">
                    <p className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide">
                      Gemini
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
                      Response from your Google AI access.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                06 · Costs, quotas, and limits
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                Your provider account still matters
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--foreground-muted)]">
                <p>
                  AI Arena does not control provider pricing, quotas, or
                  account billing. A valid API key can still fail when the
                  provider account has reached a limit or does not have the
                  required API access.
                </p>

                <p>
                  Also note that a ChatGPT subscription and OpenAI API usage
                  are billed separately.
                </p>
              </div>
            </section>

            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                07 · Key safety
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl uppercase tracking-wide">
                Treat your key like a credential
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--foreground-muted)]">
                <p>
                  Do not paste your API key into chat, source code, GitHub,
                  screenshots, or messages.
                </p>

                <p>
                  AI Arena V1 intentionally uses client-side BYOK. The key is
                  stored in your browser and used from your browser. That means
                  it is not uploaded to an AI Arena account, but it also means
                  this is not the same isolation you would get from server-side
                  secret management.
                </p>

                <p>
                  Use an appropriate API key for this setup, keep it
                  restricted where the provider supports restrictions, and
                  revoke or replace it if you believe it has been exposed.
                </p>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]">
                V1 flow
              </p>

              <div className="mt-5 space-y-4">
                {[
                  "Connect a provider",
                  "Add it to the lineup",
                  "Write one prompt",
                  "Enter the Arena",
                  "Compare the round",
                  "Continue the conversation",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex gap-3"
                  >
                    <span className="font-mono text-[9px] text-[var(--foreground-subtle)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <p className="text-sm text-[var(--foreground-muted)]">
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/"
                className="mt-7 block border border-[var(--accent)] px-4 py-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              >
                Enter the Arena →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}