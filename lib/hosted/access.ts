import { HostedError } from "./errors";
import {
  getRoundsRemaining,
  isEntitlementActive,
} from "./entitlement";
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
    !input.entitlement ||
    !activeEntitlement
  ) {
    return {
      eligible,
      accountRequired: false,
      ageConfirmationRequired,
      activeEntitlement: false,
      checkoutAvailable: eligible,
    };
  }

  /*
   * Daily usage is intentionally lazy-created by the
   * reservation service. A missing row for today's usage
   * date therefore means the account has used zero rounds
   * today; it is not an internal error.
   */
  const dailyCompletedRounds =
    input.dailyUsage?.completedRounds ?? 0;

  const dailyReservedRounds =
    input.dailyUsage?.reservedRounds ?? 0;

  const dailyRoundsRemaining =
    Math.max(
      0,
      input.entitlement.dailyLimit -
        dailyCompletedRounds -
        dailyReservedRounds,
    );

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
      totalRounds:
        input.entitlement.totalRounds,
      completedRounds:
        input.entitlement.completedRounds,
      reservedRounds:
        input.entitlement.reservedRounds,
      roundsRemaining:
        getRoundsRemaining(
          input.entitlement,
        ),
      dailyLimit:
        input.entitlement.dailyLimit,
      dailyCompletedRounds,
      dailyReservedRounds,
      dailyRoundsRemaining,
    },
  };
}