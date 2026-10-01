import { HostedError } from "./errors";
import {
  assertDailyUsageCounters,
} from "./entitlement";
import {
  getUtcDateKey,
} from "./clock";
import type {
  HostedDailyUsage,
  HostedEntitlement,
} from "./types";

export function createDailyUsage(
  entitlement: HostedEntitlement,
  usageDate: string,
  now: Date,
): HostedDailyUsage {
  if (!entitlement.id.trim()) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message: "Entitlement ID is required.",
    });
  }

  if (!usageDate.trim()) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message: "Usage date is required.",
    });
  }

  const timestamp = now.toISOString();

  return {
    id: crypto.randomUUID(),
    entitlementId: entitlement.id,
    usageDate,
    reservedRounds: 0,
    completedRounds: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getCurrentUsageDate(
  now: Date,
): string {
  return getUtcDateKey(now);
}

export function assertUsageBelongsToDate(
  usage: HostedDailyUsage,
  usageDate: string,
): void {
  if (usage.usageDate !== usageDate) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message:
        "Daily usage record does not belong to the requested usage date.",
    });
  }
}

export function assertUsageBelongsToEntitlement(
  usage: HostedDailyUsage,
  entitlement: HostedEntitlement,
): void {
  if (
    usage.entitlementId !== entitlement.id
  ) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message:
        "Daily usage record does not belong to the entitlement.",
    });
  }

  assertDailyUsageCounters(
    entitlement,
    usage,
  );
}

export function canCreateDailyUsage(
  existingUsage: HostedDailyUsage | null,
): boolean {
  return existingUsage === null;
}