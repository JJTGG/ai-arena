import { HostedError } from "./errors";
import {
  addDays,
  isValidTimeZone,
} from "./clock";
import type {
  HostedConfig,
  HostedEntitlement,
  HostedPayment,
} from "./types";

export type CreateEntitlementInput = {
  accountId: string;
  payment: HostedPayment;
  config: HostedConfig;
  startsAt: Date;
  usageTimezone: string;
};

export function createEntitlementFromConfirmedPayment(
  input: CreateEntitlementInput,
): HostedEntitlement {
  if (input.payment.status !== "confirmed") {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message:
          "Only confirmed payments can create entitlements.",
      },
    );
  }

  if (!input.accountId.trim()) {
    throw new HostedError("ACCOUNT_REQUIRED", {
      status: 400,
      message: "Account ID is required.",
    });
  }

  const usageTimezone =
    input.usageTimezone.trim();

  if (!usageTimezone) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message: "Usage timezone is required.",
    });
  }

  if (
    !isValidTimeZone(usageTimezone)
  ) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message:
        `Invalid Hosted usage timezone "${usageTimezone}".`,
    });
  }

  const startsAt = new Date(input.startsAt);
  const expiresAt = addDays(
    startsAt,
    input.config.durationDays,
  );

  return {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    paymentId: input.payment.id,
    status: "active",
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    totalRounds: input.config.totalRounds,
    completedRounds: 0,
    reservedRounds: 0,
    dailyLimit: input.config.dailyLimit,
    usageTimezone,
    createdAt: startsAt.toISOString(),
    updatedAt: startsAt.toISOString(),
  };
}

export function assertCanCreateEntitlement(
  existingActiveEntitlement:
    | HostedEntitlement
    | null,
): void {
  if (existingActiveEntitlement) {
    throw new HostedError(
      "PAYMENT_ALREADY_PROCESSED",
      {
        status: 409,
        message:
          "The account already has an active Hosted entitlement.",
      },
    );
  }
}

export function shouldExpireEntitlement(
  entitlement: HostedEntitlement,
  now: Date = new Date(),
): boolean {
  if (entitlement.status !== "active") {
    return false;
  }

  return now >= new Date(
    entitlement.expiresAt,
  );
}

export function expireEntitlement(
  entitlement: HostedEntitlement,
  now: Date = new Date(),
): HostedEntitlement {
  if (
    !shouldExpireEntitlement(
      entitlement,
      now,
    )
  ) {
    return entitlement;
  }

  return {
    ...entitlement,
    status: "expired",
    updatedAt: now.toISOString(),
  };
}

export function suspendEntitlement(
  entitlement: HostedEntitlement,
  now: Date = new Date(),
): HostedEntitlement {
  if (entitlement.status !== "active") {
    throw new HostedError(
      "ENTITLEMENT_REQUIRED",
      {
        status: 409,
        message:
          "Only an active entitlement can be suspended.",
      },
    );
  }

  return {
    ...entitlement,
    status: "suspended",
    updatedAt: now.toISOString(),
  };
}