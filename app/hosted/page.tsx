import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import { buildHostedAccessSnapshot } from "@/lib/hosted/access";
import { getCurrentUsageDate } from "@/lib/hosted/daily-usage";
import { resolveHostedSession } from "@/lib/hosted/session-service";
import { AgeConfirmation } from "./components/age-confirmation";
import { HostedAuth } from "./components/hosted-auth";
import { ResendVerification } from "./components/resend-verification";
import { HostedCheckout } from "./components/hosted-checkout";
import styles from "./hosted.module.css";

export default async function HostedPage() {
  const authContext = await getHostedAuthContext();

  if (!authContext) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.topbar}>
            <div className={styles.brand}>
              <span className={styles.brandMark}>AA</span>
              <span className={styles.brandText}>HOSTED ARENA</span>
            </div>

            <div className={styles.status}>
              <span className={styles.statusDot} />
              ACCOUNT REQUIRED
            </div>
          </header>

          <section className={styles.authSection}>
            <div className={styles.hero}>
              <p className={styles.eyebrow}>HOSTED // ACCESS SYSTEM</p>
              <h1 className={styles.title}>Enter the arena.</h1>
              <p className={styles.lead}>
                Hosted Arena gives you a ready-to-use AI battle environment
                without requiring your own provider keys.
              </p>
            </div>

            <div className={styles.authCard}>
              <HostedAuth />
            </div>
          </section>
        </div>
      </main>
    );
  }

  const repository = createNeonHostedRepository();

  const { account } = await resolveHostedSession({
    repository,
    authContext,
  });

  const entitlement = await repository.getActiveEntitlement(account.id);

  const dailyUsage = entitlement
    ? await repository.getDailyUsage(
        entitlement.id,
        getCurrentUsageDate(new Date()),
      )
    : null;

  const access = buildHostedAccessSnapshot({
    account,
    entitlement,
    dailyUsage,
  });

  const emailVerified = Boolean(account.emailVerifiedAt);
  const ageConfirmed = Boolean(account.ageConfirmedAt);

  let stateTitle = "ACCESS LOCKED";
  let stateCopy =
    "Complete the required account checks before Hosted Arena can be unlocked.";

  if (!emailVerified) {
    stateTitle = "VERIFY YOUR EMAIL";
    stateCopy =
      "Your Hosted Arena account exists, but access remains locked until your email address is verified.";
  } else if (!ageConfirmed) {
    stateTitle = "CONFIRM YOUR AGE";
    stateCopy =
      "Email verification is complete. Confirm that you are 18 or older to continue.";
  } else if (access.activeEntitlement) {
    stateTitle = "ARENA ACCESS ACTIVE";
    stateCopy =
      "Your Hosted Arena access is active. The battle surface is ready for the next stage.";
  } else if (access.checkoutAvailable) {
    stateTitle = "HOSTED ACCESS READY";
    stateCopy =
      "Your account is eligible. Activate Hosted Arena access to enter the hosted battle system.";
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>AA</span>
            <span className={styles.brandText}>HOSTED ARENA</span>
          </div>

          <div className={styles.status}>
            <span className={styles.statusDot} />
            ACCOUNT ACTIVE
          </div>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>HOSTED // ACCESS SYSTEM</p>

          <div className={styles.heroRow}>
            <div>
              <h1 className={styles.title}>Your battle space.</h1>

              <p className={styles.lead}>
                A managed Arena environment built for repeated AI-versus-AI
                rounds, without exposing the underlying provider
                infrastructure.
              </p>
            </div>

            <div className={styles.accountCard}>
              <span className={styles.accountLabel}>SIGNED IN AS</span>
              <strong className={styles.accountEmail}>{account.email}</strong>
              <span className={styles.accountMeta}>
                {account.status.toUpperCase()}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.statePanel}>
          <div className={styles.stateHeader}>
            <div>
              <p className={styles.eyebrow}>CURRENT STATE</p>
              <h2 className={styles.stateTitle}>{stateTitle}</h2>
            </div>

            <span className={styles.stateBadge}>
              {access.activeEntitlement
                ? "ACTIVE"
                : access.checkoutAvailable
                  ? "ELIGIBLE"
                  : "LOCKED"}
            </span>
          </div>

          <p className={styles.stateCopy}>{stateCopy}</p>

          <div className={styles.steps}>
            <div
              className={`${styles.step} ${
                emailVerified ? styles.stepComplete : styles.stepCurrent
              }`}
            >
              <span className={styles.stepNumber}>01</span>

              <div>
                <strong>Email verification</strong>
                <span>
                  {emailVerified ? "Complete" : "Required before access"}
                </span>
              </div>
            </div>

            <div
              className={`${styles.step} ${
                ageConfirmed ? styles.stepComplete : styles.stepCurrent
              }`}
            >
              <span className={styles.stepNumber}>02</span>

              <div>
                <strong>Age confirmation</strong>
                <span>
                  {ageConfirmed ? "Complete" : "Required before access"}
                </span>
              </div>
            </div>

            <div
              className={`${styles.step} ${
                access.activeEntitlement
                  ? styles.stepComplete
                  : styles.stepCurrent
              }`}
            >
              <span className={styles.stepNumber}>03</span>

              <div>
                <strong>Hosted entitlement</strong>
                <span>
                  {access.activeEntitlement
                    ? "Active"
                    : access.checkoutAvailable
                      ? "Ready to activate"
                      : "Waiting for eligibility"}
                </span>
              </div>
            </div>
          </div>

          {!emailVerified && (
            <div className={styles.notice}>
              <span className={styles.noticeMark}>!</span>

              <div>
                <strong>Verification required</strong>

                <p>
                  Check your inbox for the account verification flow, then
                  return here to continue.
                </p>

                <ResendVerification email={account.email} />
              </div>
            </div>
          )}

          {emailVerified && !ageConfirmed && (
            <div className={styles.notice}>
              <span className={styles.noticeMark}>18+</span>

              <div>
                <strong>Age confirmation required</strong>

                <p>
                  Email verification is complete. Confirm that you are 18 or
                  older to continue.
                </p>

                <AgeConfirmation />
              </div>
            </div>
          )}

          {access.checkoutAvailable && !access.activeEntitlement && (
            <div className={styles.offer}>
              <div>
                <p className={styles.eyebrow}>HOSTED ACCESS</p>

                <h3>60 rounds · 2 per day · 30 days</h3>

                <p>
                  Two AI entrants compete in each round. The hosted service
                  handles the provider side of the battle.
                </p>
              </div>

              <div className={styles.offerBadge}>READY</div>
              <HostedCheckout />
            </div>
          )}

          {access.activeEntitlement && (
            <div className={styles.arenaPanel}>
              <p className={styles.eyebrow}>BATTLE SYSTEM</p>

              <h3>Hosted access is active.</h3>

              <p>
                The entitlement layer is live. The next surface is the actual
                round launcher and battle result interface.
              </p>
            </div>
          )}
        </section>

        <section className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>60</span>
            <span className={styles.metricLabel}>TOTAL ROUNDS</span>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricValue}>2</span>
            <span className={styles.metricLabel}>ROUNDS / DAY</span>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricValue}>30</span>
            <span className={styles.metricLabel}>DAY WINDOW</span>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricValue}>2</span>
            <span className={styles.metricLabel}>AI ENTRANTS</span>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>AI ARENA // HOSTED</span>
          <span>ACCESS CONTROLLED</span>
        </footer>
      </div>
    </main>
  );
}
