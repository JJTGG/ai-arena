import type {
  HostedDailyUsage,
  HostedEntitlement,
} from "./types";

export function getRoundsRemaining(
  entitlement: HostedEntitlement,
): number {
  return Math.max(
    0,
    entitlement.totalRounds -
      entitlement.completedRounds -
      entitlement.reservedRounds,
  );
}

export function getDailyRoundsRemaining(
  entitlement: HostedEntitlement,
  dailyUsage: HostedDailyUsage,
): number {
  return Math.max(
    0,
    entitlement.dailyLimit -
      dailyUsage.completedRounds -
      dailyUsage.reservedRounds,
  );
}

export function hasTotalCapacity(
  entitlement: HostedEntitlement,
): boolean {
  return getRoundsRemaining(entitlement) > 0;
}

export function hasDailyCapacity(
  entitlement: HostedEntitlement,
  dailyUsage: HostedDailyUsage,
): boolean {
  return getDailyRoundsRemaining(
    entitlement,
    dailyUsage,
  ) > 0;
}

export function isEntitlementActive(
  entitlement: HostedEntitlement,
  now: Date = new Date(),
): boolean {
  if (entitlement.status !== "active") {
    return false;
  }

  const startsAt = new Date(entitlement.startsAt);
  const expiresAt = new Date(entitlement.expiresAt);

  return (
    now >= startsAt &&
    now < expiresAt
  );
}

export function canReserveRound(
  entitlement: HostedEntitlement,
  dailyUsage: HostedDailyUsage,
  now: Date = new Date(),
): boolean {
  return (
    isEntitlementActive(entitlement, now) &&
    hasTotalCapacity(entitlement) &&
    hasDailyCapacity(entitlement, dailyUsage)
  );
}

export function assertEntitlementCounters(
  entitlement: HostedEntitlement,
): void {
  if (
    entitlement.completedRounds < 0 ||
    entitlement.reservedRounds < 0
  ) {
    throw new Error(
      "HOSTED_ENTITLEMENT_INVALID_COUNTERS",
    );
  }

  if (
    entitlement.completedRounds +
      entitlement.reservedRounds >
    entitlement.totalRounds
  ) {
    throw new Error(
      "HOSTED_ENTITLEMENT_COUNTER_INVARIANT_VIOLATION",
    );
  }
}

export function assertDailyUsageCounters(
  entitlement: HostedEntitlement,
  dailyUsage: HostedDailyUsage,
): void {
  if (
    dailyUsage.completedRounds < 0 ||
    dailyUsage.reservedRounds < 0
  ) {
    throw new Error(
      "HOSTED_DAILY_USAGE_INVALID_COUNTERS",
    );
  }

  if (
    dailyUsage.completedRounds +
      dailyUsage.reservedRounds >
    entitlement.dailyLimit
  ) {
    throw new Error(
      "HOSTED_DAILY_USAGE_LIMIT_VIOLATION",
    );
  }
}