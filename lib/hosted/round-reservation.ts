import { HostedError } from "./errors";
import {
  assertDailyUsageCounters,
  assertEntitlementCounters,
  canReserveRound,
} from "./entitlement";
import { getUtcDateKey } from "./clock";
import type {
  HostedDailyUsage,
  HostedEntitlement,
  HostedRound,
} from "./types";

export type ReserveRoundInput = {
  entitlement: HostedEntitlement;
  dailyUsage: HostedDailyUsage;
  idempotencyKey: string;
  now: Date;
};

export function validateRoundReservation(
  input: ReserveRoundInput,
): void {
  assertEntitlementCounters(
    input.entitlement,
  );

  assertDailyUsageCounters(
    input.entitlement,
    input.dailyUsage,
  );

  if (!input.idempotencyKey.trim()) {
    throw new HostedError(
      "IDEMPOTENCY_CONFLICT",
      {
        status: 400,
        message:
          "An idempotency key is required to reserve a round.",
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

  if (!canReserveRound(
    input.entitlement,
    input.dailyUsage,
    input.now,
  )) {
    if (
      input.entitlement.completedRounds +
        input.entitlement.reservedRounds >=
      input.entitlement.totalRounds
    ) {
      throw new HostedError(
        "NO_ROUNDS_AVAILABLE",
        {
          status: 409,
          message:
            "No Hosted rounds remain.",
        },
      );
    }

    throw new HostedError(
      "DAILY_LIMIT_REACHED",
      {
        status: 409,
        message:
          "The daily Hosted round limit has been reached.",
      },
    );
  }
}

export function createReservedRound(
  input: ReserveRoundInput,
): HostedRound {
  validateRoundReservation(input);

  const now = input.now.toISOString();

  return {
    id: crypto.randomUUID(),
    entitlementId: input.entitlement.id,
    idempotencyKey: input.idempotencyKey.trim(),
    usageDate: getUtcDateKey(input.now),
    status: "reserved",
    reservedAt: now,
    startedAt: null,
    completedAt: null,
    releasedAt: null,
    failureCode: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function reserveCounters(
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

  const updatedEntitlement = {
    ...entitlement,
    reservedRounds:
      entitlement.reservedRounds + 1,
  };

  const updatedDailyUsage = {
    ...dailyUsage,
    reservedRounds:
      dailyUsage.reservedRounds + 1,
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