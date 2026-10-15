import { redirect } from "next/navigation";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import { buildHostedAccessSnapshot } from "@/lib/hosted/access";
import { getCurrentUsageDate } from "@/lib/hosted/daily-usage";
import { resolveHostedSession } from "@/lib/hosted/session-service";

import HostedArenaClient from "./hosted-arena-client";

export const metadata = {
  title: "Hosted Arena | AI Arena",
  description:
    "Enter hosted AI battles with two managed entrants.",
};

export default async function HostedArenaPage() {
  const authContext = await getHostedAuthContext();

  if (!authContext) {
    redirect("/hosted");
  }

  const repository = createNeonHostedRepository();
  const now = new Date();

  const { account } = await resolveHostedSession({
    repository,
    authContext,
  });

  const entitlement =
    await repository.getActiveEntitlement(account.id);

  const dailyUsage = entitlement
    ? await repository.getDailyUsage(
        entitlement.id,
        getCurrentUsageDate(now),
      )
    : null;

  const access = buildHostedAccessSnapshot({
    account,
    entitlement,
    dailyUsage,
    now,
  });

  if (
    !account.emailVerifiedAt ||
    !account.ageConfirmedAt ||
    !access.activeEntitlement ||
    !access.entitlement
  ) {
    redirect("/hosted");
  }

  return (
    <HostedArenaClient
      initialUsage={{
        totalRoundsRemaining:
          access.entitlement.roundsRemaining,
        dailyRoundsRemaining:
          access.entitlement.dailyRoundsRemaining,
        completedRounds:
          access.entitlement.completedRounds,
        totalRounds:
          access.entitlement.totalRounds,
        dailyLimit:
          access.entitlement.dailyLimit,
        expiresAt:
          access.entitlement.expiresAt,
      }}
    />
  );
}