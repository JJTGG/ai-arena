import Link from "next/link";
import type { Metadata } from "next";
import styles from "./guide.module.css";

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

const flowSteps = [
  "Connect a provider",
  "Add it to the lineup",
  "Write one prompt",
  "Enter the Arena",
  "Compare the round",
  "Continue the conversation",
];

export default function GuidePage() {
  return (
    <main className={styles.guidePage}>
      <div className={styles.guideShell}>
        <header className={styles.header}>
          <Link href="/arena" className={styles.backLink}>
            ← Back to Arena
          </Link>

          <span className={styles.headerTag}>BYOK · GUIDE</span>
        </header>

        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>Start here</p>

          <h1 className={styles.heroTitle}>How AI Arena Works</h1>

          <p className={styles.heroText}>
            AI Arena lets you bring your own provider access, build a lineup,
            send one prompt, and inspect the resulting answers side by side.
          </p>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.content}>
            <section className={styles.section}>
              <span className={styles.sectionIndex}>01 · BYOK</span>

              <h2 className={styles.sectionTitle}>Bring Your Own Key</h2>

              <div className={styles.sectionBody}>
                <p>
                  BYOK means <strong>Bring Your Own Key</strong>. AI Arena does
                  not provide shared provider credits for V1. Instead, the
                  provider access comes from a key you connect in your browser.
                </p>

                <p>
                  The selected provider handles the request. Your provider
                  account therefore remains responsible for the access, quota,
                  billing, and usage limits that apply to that account.
                </p>
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionIndex}>
                02 · PROVIDERS
              </span>

              <h2 className={styles.sectionTitle}>
                Choose Your Providers
              </h2>

              <div className={styles.providerGrid}>
                {providers.map((provider) => (
                  <div className={styles.providerCard} key={provider.name}>
                    <p className={styles.providerName}>{provider.name}</p>

                    <p className={styles.providerType}>
                      {provider.description}
                    </p>

                    <a
                      href={provider.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.providerLink}
                    >
                      Open key management ↗
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionIndex}>
                03 · API KEYS
              </span>

              <h2 className={styles.sectionTitle}>
                Create or Copy a Key
              </h2>

              <div className={styles.setupStack}>
                <div className={styles.setupBlock}>
                  <div className={styles.setupHeader}>
                    <span className={styles.setupProvider}>OpenAI</span>
                    <span className={styles.setupMarker}>Provider setup</span>
                  </div>

                  <ol className={styles.setupList}>
                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>01</span>
                      <span>Sign in to the OpenAI API platform.</span>
                    </li>

                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>02</span>
                      <span>Open the API keys area.</span>
                    </li>

                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>03</span>
                      <span>
                        Create a key for the project you intend to use.
                      </span>
                    </li>

                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>04</span>
                      <span>Copy the key and keep it private.</span>
                    </li>
                  </ol>
                </div>

                <div className={styles.setupBlock}>
                  <div className={styles.setupHeader}>
                    <span className={styles.setupProvider}>Gemini</span>
                    <span className={styles.setupMarker}>Provider setup</span>
                  </div>

                  <ol className={styles.setupList}>
                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>01</span>
                      <span>Sign in to Google AI Studio.</span>
                    </li>

                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>02</span>
                      <span>Open the API keys area.</span>
                    </li>

                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>03</span>
                      <span>
                        Create or select the key you want to use.
                      </span>
                    </li>

                    <li className={styles.setupItem}>
                      <span className={styles.setupNumber}>04</span>
                      <span>Copy the key and keep it private.</span>
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionIndex}>
                04 · CONNECT
              </span>

              <h2 className={styles.sectionTitle}>
                Add a Provider to Your Lineup
              </h2>

              <div className={styles.sectionBody}>
                <p>
                  Return to the Arena and open the provider slot you want to
                  connect. Paste the API key, save it, and that provider becomes
                  available for your lineup.
                </p>

                <p>
                  You can connect one provider or both. The Arena does not
                  require a two-provider matchup.
                </p>
              </div>

              <div className={styles.note}>
                <p className={styles.noteLabel}>Browser storage</p>

                <p className={styles.noteText}>
                  AI Arena V1 stores your connected key in your browser and
                  uses it from the browser. It is not attached to an AI Arena
                  account.
                </p>
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionIndex}>
                05 · THE ARENA
              </span>

              <h2 className={styles.sectionTitle}>
                One Prompt. One Round.
              </h2>

              <div className={styles.example}>
                <div className={styles.examplePrompt}>
                  <p className={styles.exampleLabel}>Example prompt</p>

                  <p className={styles.exampleQuestion}>
                    “Explain the trade-offs of building a system this way.”
                  </p>
                </div>

                <div className={styles.exampleResults}>
                  <div className={styles.exampleResult}>
                    <p className={styles.exampleResultName}>ChatGPT</p>

                    <p className={styles.exampleResultText}>
                      Response generated through your OpenAI API access.
                    </p>
                  </div>

                  <div className={styles.exampleResult}>
                    <p className={styles.exampleResultName}>Gemini</p>

                    <p className={styles.exampleResultText}>
                      Response generated through your Google AI access.
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.flow}>
                {flowSteps.map((step, index) => (
                  <div className={styles.flowStep} key={step}>
                    <span className={styles.flowStepNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className={styles.flowStepText}>{step}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionIndex}>
                06 · USAGE
              </span>

              <h2 className={styles.sectionTitle}>
                Your Provider Account Still Matters
              </h2>

              <div className={styles.sectionBody}>
                <p>
                  AI Arena does not control provider pricing, quotas, account
                  billing, or API eligibility.
                </p>

                <p>
                  A key can be valid and a request can still fail when the
                  provider account has reached a limit or does not have the
                  required API access.
                </p>

                <p>
                  ChatGPT subscriptions and OpenAI API usage are also separate
                  products with separate usage arrangements.
                </p>
              </div>
            </section>

            <section className={styles.section}>
              <span className={styles.sectionIndex}>
                07 · KEY SAFETY
              </span>

              <h2 className={styles.sectionTitle}>
                Treat Your Key Like a Credential
              </h2>

              <div className={styles.sectionBody}>
                <p>
                  Do not paste your API key into chat, source code, GitHub,
                  screenshots, or messages.
                </p>

                <p>
                  Use an appropriate key for this browser-based BYOK setup.
                  Restrict it where the provider supports restrictions, and
                  revoke or replace it when you believe it has been exposed.
                </p>
              </div>

              <div className={styles.note}>
                <p className={styles.noteLabel}>Important</p>

                <p className={styles.noteText}>
                  Client-side BYOK is intentionally simple for V1, but it is
                  not equivalent to server-side secret management.
                </p>
              </div>
            </section>
          </div>

          <aside className={styles.rail}>
            <p className={styles.railLabel}>V1 flow</p>

            <div className={styles.railSteps}>
              {flowSteps.map((step, index) => (
                <div className={styles.railStep} key={step}>
                  <span className={styles.railStepNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className={styles.railStepText}>{step}</span>
                </div>
              ))}
            </div>

            <Link href="/arena" className={styles.railAction}>
              Enter the Arena →
            </Link>
          </aside>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerText}>
            AI Arena · V1 · BYOK
          </span>

          <Link href="/arena" className={styles.footerLink}>
            Back to Arena →
          </Link>
        </footer>
      </div>
    </main>
  );
}