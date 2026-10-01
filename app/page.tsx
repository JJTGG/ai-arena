"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./home.module.css";

const HOW_IT_WORKS = [
  {
    number: "01",
    title: "Ask",
    text: "Put one prompt on the floor.",
  },
  {
    number: "02",
    title: "Enter",
    text: "Send the same prompt to multiple entrants.",
  },
  {
    number: "03",
    title: "Compare",
    text: "See the responses together and decide what holds up.",
  },
];

const BUILT_FOR = [
  "Writing",
  "Coding",
  "Research",
  "Analysis",
  "Brainstorming",
  "Decision support",
];

const FAQ = [
  {
    question: "What is AI Arena?",
    answer:
      "AI Arena is a workspace built around one simple idea: give multiple AI entrants the same prompt and compare what comes back in one place.",
  },
  {
    question: "What is BYOK?",
    answer:
      "BYOK means Bring Your Own Key. You connect your own supported provider access and use AI Arena without needing an AI Arena account.",
  },
  {
    question: "What is Hosted?",
    answer:
      "Hosted is the managed access path. AI Arena provides the hosted model access, so you do not need to bring your own API keys.",
  },
  {
    question: "How are hosted models selected?",
    answer:
      "The Hosted lineup is controlled by AI Arena. Underlying providers and models may change as the product and infrastructure evolve.",
  },
  {
    question: "Are API keys stored?",
    answer:
      "BYOK keys remain part of the browser-based BYOK experience. Hosted access does not require you to provide provider API keys.",
  },
  {
    question: "Who can use Hosted?",
    answer:
      "Hosted access is intended for adults and will require an AI Arena account.",
  },
];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`${styles.reveal} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    setMotionReady(true);

    const elements = document.querySelectorAll(
      "[data-arena-reveal]",
    );

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => {
        element.classList.add(styles.revealVisible);
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main
      className={`${styles.home} ${
        motionReady ? styles.motionReady : ""
      }`}
    >
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="AI Arena home">
            <span className={styles.brandSignal} />
            <span className={styles.brandName}>AI Arena</span>
          </Link>

          <nav className={styles.nav} aria-label="Primary navigation">
            <Link href="#arena" className={styles.navLink}>
              The Arena
            </Link>

            <Link href="#hosted-access" className={styles.navLink}>
              Hosted
            </Link>

            <Link href="/arena" className={styles.navAction}>
              Enter Arena
            </Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroAtmosphere}>
            <span className={styles.heroRing} />
            <span className={styles.heroRingSmall} />
            <span className={styles.heroSignalLine} />
          </div>

          <Reveal className={styles.heroInner} delay={80}>
            <p className={styles.eyebrow}>ARENA SYSTEM · ONLINE</p>

            <h1 className={styles.heroTitle}>
              One prompt.
              <span>Multiple minds.</span>
            </h1>

            <p className={styles.heroText}>
              Compare AI responses in one Arena instead of opening another
              collection of tabs.
            </p>

            <div className={styles.heroActions}>
              <Link href="/arena" className={styles.primaryButton}>
                Enter the Arena
              </Link>

              <a href="#hosted-access" className={styles.secondaryButton}>
                Explore Hosted Access
              </a>
            </div>

            <div className={styles.heroReadout}>
              <span>ROUND SYSTEM</span>
              <span className={styles.readoutLine} />
              <span>READY</span>
            </div>
          </Reveal>
        </section>

        <section className={styles.section}>
          <Reveal delay={80}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>01 · THE FLOW</p>

                <h2 className={styles.sectionTitle}>
                  How the Arena works
                </h2>
              </div>

              <p className={styles.sectionNote}>
                One prompt.
                <br />
                Same conditions.
              </p>
            </div>
          </Reveal>

          <div className={styles.flowGrid}>
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.number} delay={140 + index * 90}>
                <article className={styles.flowCard}>
                  <div className={styles.cardIndex}>
                    {step.number}
                  </div>

                  <div className={styles.cardRule} />

                  <h3 className={styles.cardTitle}>{step.title}</h3>

                  <p className={styles.cardText}>{step.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <Reveal delay={80}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>02 · ENTRY</p>

                <h2 className={styles.sectionTitle}>
                  Two ways to enter
                </h2>
              </div>
            </div>
          </Reveal>

          <div className={styles.entryGrid}>
            <Reveal delay={150}>
              <article className={styles.entryCard}>
                <div className={styles.entryTop}>
                  <div>
                    <p className={styles.eyebrow}>FREE ACCESS</p>
                    <h3 className={styles.entryTitle}>BYOK</h3>
                  </div>

                  <span className={styles.entryMarker}>01</span>
                </div>

                <p className={styles.entryText}>
                  Bring your own API keys and use the Arena directly from your
                  browser.
                </p>

                <div className={styles.entryMeta}>
                  <span>NO ACCOUNT REQUIRED</span>
                  <span>YOUR KEYS</span>
                </div>

                <Link href="/arena" className={styles.entryButton}>
                  Enter with BYOK
                </Link>
              </article>
            </Reveal>

            <Reveal delay={240}>
              <article className={styles.entryCard}>
                <div className={styles.entryTop}>
                  <div>
                    <p className={styles.eyebrow}>MANAGED ACCESS</p>
                    <h3 className={styles.entryTitle}>Hosted</h3>
                  </div>

                  <span className={styles.entryMarker}>02</span>
                </div>

                <p className={styles.entryText}>
                  No provider keys to manage. AI Arena handles the hosted
                  access behind the Arena.
                </p>

                <div className={styles.entryMeta}>
                  <span>ACCOUNT REQUIRED</span>
                  <span>HOSTED ACCESS</span>
                </div>

                <a
                  href="#hosted-access"
                  className={styles.entryButton}
                >
                  Explore Hosted
                </a>
              </article>
            </Reveal>
          </div>
        </section>

        <section id="arena" className={`${styles.section} ${styles.arenaSection}`}>
          <Reveal delay={80}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>03 · THE ARENA</p>

                <h2 className={styles.sectionTitle}>
                  Same prompt. Multiple entrants.
                </h2>
              </div>

              <p className={styles.sectionNote}>
                The product is
                <br />
                the comparison.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className={styles.arenaPreview}>
              <div className={styles.arenaPreviewTop}>
                <span>ROUND 07</span>
                <span>2 ENTRANTS</span>
                <span>COMPARE</span>
              </div>

              <div className={styles.arenaPrompt}>
                <p className={styles.arenaPromptLabel}>PROMPT</p>

                <p className={styles.arenaPromptText}>
                  Explain the trade-offs of building a system this way.
                </p>
              </div>

              <div className={styles.arenaLanes}>
                <article className={`${styles.arenaLane} ${styles.arenaLaneCyan}`}>
                  <header className={styles.laneHeader}>
                    <div>
                      <span className={styles.laneSignal} />
                      <span>ENTRANT 01</span>
                    </div>

                    <span>COMPLETE</span>
                  </header>

                  <p className={styles.laneText}>
                    A strong first response appears here, with its reasoning
                    and trade-offs visible in the same round.
                  </p>
                </article>

                <article
                  className={`${styles.arenaLane} ${styles.arenaLaneMagenta}`}
                >
                  <header className={styles.laneHeader}>
                    <div>
                      <span className={styles.laneSignal} />
                      <span>ENTRANT 02</span>
                    </div>

                    <span>COMPLETE</span>
                  </header>

                  <p className={styles.laneText}>
                    A second response arrives under the same conditions, making
                    similarities and differences immediately visible.
                  </p>
                </article>
              </div>

              <div className={styles.arenaPreviewBottom}>
                <span>SAME PROMPT</span>
                <span className={styles.previewDivider} />
                <span>SIDE-BY-SIDE RESULT</span>
              </div>
            </div>
          </Reveal>
        </section>

        <section
          id="hosted-access"
          className={`${styles.section} ${styles.hostedSection}`}
        >
          <Reveal delay={80}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>04 · HOSTED ACCESS</p>

                <h2 className={styles.sectionTitle}>
                  Enter without bringing your own keys.
                </h2>
              </div>

              <p className={styles.sectionNote}>
                Managed by
                <br />
                AI Arena.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className={styles.hostedPanel}>
              <div className={styles.hostedIntro}>
                <p className={styles.eyebrow}>HOSTED ACCESS</p>

                <h3 className={styles.hostedTitle}>
                  The Arena,
                  <span>without the provider setup.</span>
                </h3>

                <p className={styles.hostedText}>
                  Hosted access gives you a controlled Arena experience without
                  requiring you to manage third-party API keys yourself.
                </p>
              </div>

              <div className={styles.hostedReadout}>
                <div className={styles.readoutRow}>
                  <span>ACCESS WINDOW</span>
                  <strong>30 DAYS</strong>
                </div>

                <div className={styles.readoutRow}>
                  <span>ROUNDS</span>
                  <strong>60</strong>
                </div>

                <div className={styles.readoutRow}>
                  <span>ENTRANTS / ROUND</span>
                  <strong>2</strong>
                </div>

                <div className={styles.readoutRow}>
                  <span>DAILY CEILING</span>
                  <strong>2 ROUNDS</strong>
                </div>
              </div>

              <a
                href="#hosted-access"
                className={styles.primaryButton}
                aria-label="Hosted Access"
              >
                Get Hosted Access
              </a>
            </div>
          </Reveal>
        </section>

        <section className={styles.section}>
          <Reveal delay={80}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>05 · USE CASES</p>

                <h2 className={styles.sectionTitle}>Built for actual work.</h2>
              </div>
            </div>
          </Reveal>

          <div className={styles.useCaseGrid}>
            {BUILT_FOR.map((item, index) => (
              <Reveal key={item} delay={120 + index * 55}>
                <div className={styles.useCase}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <Reveal delay={80}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>06 · FAQ</p>

                <h2 className={styles.sectionTitle}>Arena questions.</h2>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className={styles.faqList}>
              {FAQ.map((item, index) => {
                const isOpen = activeFaq === index;

                return (
                  <article
                    key={item.question}
                    className={`${styles.faqItem} ${
                      isOpen ? styles.faqItemOpen : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={styles.faqButton}
                      aria-expanded={isOpen}
                      onClick={() =>
                        setActiveFaq(isOpen ? null : index)
                      }
                    >
                      <span className={styles.faqNumber}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className={styles.faqQuestion}>
                        {item.question}
                      </span>

                      <span className={styles.faqState}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    <div className={styles.faqAnswer}>
                      <p>{item.answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className={styles.finalSection}>
          <Reveal delay={80}>
            <div className={styles.finalPanel}>
              <p className={styles.eyebrow}>07 · READY</p>

              <h2 className={styles.finalTitle}>
                Step onto the floor.
              </h2>

              <p className={styles.finalText}>
                Start with your own provider access, or explore the managed
                Arena experience.
              </p>

              <div className={styles.heroActions}>
                <Link href="/arena" className={styles.primaryButton}>
                  Start with BYOK
                </Link>

                <a
                  href="#hosted-access"
                  className={styles.secondaryButton}
                >
                  Get Hosted Access
                </a>
              </div>
            </div>
          </Reveal>
        </section>

        <footer className={styles.footer}>
          <span>AI Arena</span>

          <div className={styles.footerLinks}>
            <Link href="/arena">Arena</Link>
            <Link href="/guide">Guide</Link>
          </div>

          <span>One prompt · multiple minds</span>
        </footer>
      </div>
    </main>
  );
}