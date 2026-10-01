import { HostedError } from "./errors";
import { getDailyRoundsRemaining, getRoundsRemaining, isEntitlementActive } from "./entitlement";
import type {
  HostedAccessSnapshot,
  HostedAccount,
  HostedDailyUsage,
  HostedEntitlement,
} from "./types";

export type HostedAccessInput = {
  account: HostedAccount | null;
  entitlement: HostedEntitlement | null;
  dailyUsage: HostedDailyUsage | null;
  now?: Date;
};

export function buildHostedAccessSnapshot(
  input: HostedAccessInput,
): HostedAccessSnapshot {
  if (!input.account) {
    return {
      eligible: false,
      accountRequired: true,
      ageConfirmationRequired: true,
      activeEntitlement: false,
      checkoutAvailable: false,
    };
  }

  if (input.account.status === "suspended") {
    throw new HostedError("ACCOUNT_SUSPENDED", {
      status: 403,
      message: "This account is suspended.",
    });
  }

  const ageConfirmationRequired =
    !input.account.ageConfirmedAt;

  const eligible =
    Boolean(input.account.emailVerifiedAt) &&
    !ageConfirmationRequired;

  const activeEntitlement =
    input.entitlement !== null &&
    isEntitlementActive(
      input.entitlement,
      input.now ?? new Date(),
    );

  if (
    input.entitlement &&
    activeEntitlement &&
    !input.dailyUsage
  ) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message: "Active entitlement is missing daily usage state.",
    });
  }

  if (
    !input.entitlement ||
    !activeEntitlement ||
    !input.dailyUsage
  ) {
    return {
      eligible,
      accountRequired: false,
      ageConfirmationRequired,
      activeEntitlement: false,
      checkoutAvailable: eligible,
    };
  }

  return {
    eligible,
    accountRequired: false,
    ageConfirmationRequired,
    activeEntitlement: true,
    checkoutAvailable: false,
    entitlement: {
      status: input.entitlement.status,
      startsAt: input.entitlement.startsAt,
      expiresAt: input.entitlement.expiresAt,
      totalRounds: input.entitlement.totalRounds,
      completedRounds:
        input.entitlement.completedRounds,
      reservedRounds:
        input.entitlement.reservedRounds,
      roundsRemaining:
        getRoundsRemaining(input.entitlement),
      dailyLimit:
        input.entitlement.dailyLimit,
      dailyCompletedRounds:
        input.dailyUsage.completedRounds,
      dailyReservedRounds:
        input.dailyUsage.reservedRounds,
      dailyRoundsRemaining:
        getDailyRoundsRemaining(
          input.entitlement,
          input.dailyUsage,
        ),
    },
  };
}