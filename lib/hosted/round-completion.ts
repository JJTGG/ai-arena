import { HostedError } from "./errors";
import {
  assertDailyUsageCounters,
  assertEntitlementCounters,
} from "./entitlement";
import {
  allAttemptsComplete,
  assertExpectedAttemptSlots,
} from "./attempts";
import {
  assertRoundCompletable,
} from "./rounds";
import type {
  HostedDailyUsage,
  HostedEntitlement,
  HostedRound,
  HostedRoundAttempt,
} from "./types";

export type CompleteRoundInput = {
  round: HostedRound;
  entitlement: HostedEntitlement;
  dailyUsage: HostedDailyUsage;
  attempts: HostedRoundAttempt[];
  now: Date;
};

export function validateRoundCompletion(
  input: CompleteRoundInput,
): void {
  assertRoundCompletable(input.round);

  assertExpectedAttemptSlots(
    input.attempts,
    2,
  );

  if (!allAttemptsComplete(input.attempts, 2)) {
    throw new HostedError(
      "INVALID_PROVIDER_RESULT",
      {
        status: 409,
        message:
          "A Hosted round requires both entrant attempts to complete.",
      },
    );
  }

  if (
    input.round.entitlementId !==
    input.entitlement.id
  ) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Round does not belong to the entitlement.",
      },
    );
  }

  if (
    input.dailyUsage.entitlementId !==
    input.entitlement.id
  ) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Daily usage does not belong to the entitlement.",
      },
    );
  }

  assertEntitlementCounters(
    input.entitlement,
  );

  assertDailyUsageCounters(
    input.entitlement,
    input.dailyUsage,
  );

  if (input.entitlement.reservedRounds <= 0) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Cannot complete a round without a reserved entitlement slot.",
      },
    );

  }

  if (input.dailyUsage.reservedRounds <= 0) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Cannot complete a round without a reserved daily slot.",
      },
    );
  }
}

export function completeCounters(
  entitlement: HostedEntitlement,
  dailyUsage: HostedDailyUsage,
): {
  entitlement: HostedEntitlement;
  dailyUsage: HostedDailyUsage;
} {
  assertEntitlementCounters(entitlement);
  assertDailyUsageCounters(
    entitlement,
    dailyUsage,
  );

  if (
    entitlement.reservedRounds <= 0 ||
    dailyUsage.reservedRounds <= 0
  ) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Completion requires an existing reservation.",
      },
    );
  }

  const updatedEntitlement = {
    ...entitlement,
    reservedRounds:
      entitlement.reservedRounds - 1,
    completedRounds:
      entitlement.completedRounds + 1,
  };

  const updatedDailyUsage = {
    ...dailyUsage,
    reservedRounds:
      dailyUsage.reservedRounds - 1,
    completedRounds:
      dailyUsage.completedRounds + 1,
  };

  assertEntitlementCounters(
    updatedEntitlement,
  );

  assertDailyUsageCounters(
    updatedEntitlement,
    updatedDailyUsage,
  );

  return {
    entitlement: updatedEntitlement,
    dailyUsage: updatedDailyUsage,
  };
}

export function markRoundCompleted(
  round: HostedRound,
  now: Date,
): HostedRound {
  assertRoundCompletable(round);

  const timestamp = now.toISOString();

  return {
    ...round,
    status: "completed",
    completedAt: timestamp,
    updatedAt: timestamp,
  };
}