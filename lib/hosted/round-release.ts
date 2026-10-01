import { HostedError } from "./errors";
import {
  assertDailyUsageCounters,
  assertEntitlementCounters,
} from "./entitlement";
import { assertRoundReleasable } from "./rounds";
import type {
  HostedDailyUsage,
  HostedEntitlement,
  HostedRound,
} from "./types";

export type ReleaseRoundInput = {
  round: HostedRound;
  entitlement: HostedEntitlement;
  dailyUsage: HostedDailyUsage;
  now: Date;
  failureCode?: HostedRound["failureCode"];
};

export function validateRoundRelease(
  input: ReleaseRoundInput,
): void {
  assertRoundReleasable(input.round);

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
          "Cannot release a round without a reserved entitlement slot.",
      },
    );
  }

  if (input.dailyUsage.reservedRounds <= 0) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Cannot release a round without a reserved daily slot.",
      },
    );
  }
}

export function releaseCounters(
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
          "Release requires an existing reservation.",
      },
    );
  }

  const updatedEntitlement = {
    ...entitlement,
    reservedRounds:
      entitlement.reservedRounds - 1,
  };

  const updatedDailyUsage = {
    ...dailyUsage,
    reservedRounds:
      dailyUsage.reservedRounds - 1,
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

export function markRoundReleased(
  round: HostedRound,
  now: Date,
  failureCode: HostedRound["failureCode"] = null,
): HostedRound {
  assertRoundReleasable(round);

  const timestamp = now.toISOString();

  return {
    ...round,
    status: "released",
    releasedAt: timestamp,
    failureCode,
    updatedAt: timestamp,
  };
}