import { HostedError } from "./errors";
import {
  isEntitlementActive,
} from "./entitlement";
import {
  createDailyUsage,
} from "./daily-usage";
import {
  getDateKeyInTimeZone,
} from "./clock";
import {
  requireIdempotencyKey,
} from "./idempotency";
import {
  createReservedRound,
  reserveCounters,
} from "./round-reservation";
import type {
  HostedRepository,
} from "./repository";
import type {
  HostedRound,
} from "./types";
import {
  SystemHostedClock,
  type HostedClock,
} from "./clock";

export type ReserveHostedRoundInput = {
  repository: HostedRepository;
  accountId: string;
  idempotencyKey: string;
  prompt: string;
  clock?: HostedClock;
};

export type ReserveHostedRoundResult = {
  round: HostedRound;
  created: boolean;
};

function getUsageDate(
  usageTimezone: string,
  now: Date,
): string {
  const timezone =
    usageTimezone.trim();

  if (!timezone) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Hosted entitlement usage timezone is missing.",
      },
    );
  }

  try {
    return getDateKeyInTimeZone(
      now,
      timezone,
    );
  } catch {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          `Hosted entitlement usage timezone "${timezone}" is invalid.`,
      },
    );
  }
}

function assertReservationEntitlement(
  entitlement: Parameters<
    typeof createReservedRound
  >[0]["entitlement"],
  now: Date,
): void {
  if (
    entitlement.status !== "active"
  ) {
    throw new HostedError(
      "ENTITLEMENT_REQUIRED",
      {
        status: 409,
        message:
          "An active Hosted entitlement is required.",
      },
    );
  }

  if (
    now >= new Date(
      entitlement.expiresAt,
    )
  ) {
    throw new HostedError(
      "ENTITLEMENT_EXPIRED",
      {
        status: 409,
        message:
          "The Hosted entitlement has expired.",
      },
    );
  }

  if (
    now < new Date(
      entitlement.startsAt,
    )
  ) {
    throw new HostedError(
      "ENTITLEMENT_REQUIRED",
      {
        status: 409,
        message:
          "The Hosted entitlement is not active yet.",
      },
    );
  }

  if (
    !isEntitlementActive(
      entitlement,
      now,
    )
  ) {
    throw new HostedError(
      "ENTITLEMENT_REQUIRED",
      {
        status: 409,
        message:
          "An active Hosted entitlement is required.",
      },
    );
  }
}

function assertSameReservationRequest(
  existingRound: HostedRound,
  requestedPrompt: string,
): void {
  if (
    existingRound.prompt.trim() !==
    requestedPrompt.trim()
  ) {
    throw new HostedError(
      "IDEMPOTENCY_CONFLICT",
      {
        status: 409,
        message:
          "The idempotency key was already used for a different round request.",
      },
    );
  }
}

export async function reserveHostedRound(
  input: ReserveHostedRoundInput,
): Promise<ReserveHostedRoundResult> {
  const accountId =
    input.accountId.trim();

  if (!accountId) {
    throw new HostedError(
      "ACCOUNT_REQUIRED",
      {
        status: 400,
        message:
          "Account ID is required.",
      },
    );
  }

  const idempotencyKey =
    requireIdempotencyKey(
      input.idempotencyKey,
    );

  const clock =
    input.clock ??
    new SystemHostedClock();

  return input.repository.executeTransaction(
    async (repository) => {
      const now = clock.now();

      /*
       * Lock order:
       *
       * entitlement
       *     ↓
       * daily usage
       *     ↓
       * round
       *
       * The entitlement is the serialization point for
       * concurrent reservation requests belonging to the
       * same entitlement.
       */
      const entitlement =
        await repository.getActiveEntitlement(
          accountId,
          {
            forUpdate: true,
          },
        );

      if (!entitlement) {
        throw new HostedError(
          "ENTITLEMENT_REQUIRED",
          {
            status: 409,
            message:
              "An active Hosted entitlement is required.",
          },
        );
      }

      assertReservationEntitlement(
        entitlement,
        now,
      );

      /*
       * Idempotency lookup is deliberately unlocked.
       *
       * The entitlement row is already locked, so every
       * reservation using this entitlement is serialized
       * before this lookup occurs.
       */
      const existingRound =
        await repository.getRoundByIdempotencyKey(
          entitlement.id,
          idempotencyKey,
        );

      if (existingRound) {
        assertSameReservationRequest(
          existingRound,
          input.prompt,
        );

        return {
          round: existingRound,
          created: false,
        };
      }

      const usageDate =
        getUsageDate(
          entitlement.usageTimezone,
          now,
        );

      let dailyUsage =
        await repository.getDailyUsage(
          entitlement.id,
          usageDate,
        );

      if (!dailyUsage) {
        const newDailyUsage =
          createDailyUsage(
            entitlement,
            usageDate,
            now,
          );

        await repository.createDailyUsage(
          newDailyUsage,
        );
      }

      /*
       * Re-read with FOR UPDATE so the daily usage row
       * is explicitly held for the rest of this transaction.
       */
      dailyUsage =
        await repository.getDailyUsage(
          entitlement.id,
          usageDate,
          {
            forUpdate: true,
          },
        );

      if (!dailyUsage) {
        throw new HostedError(
          "INTERNAL_ERROR",
          {
            status: 500,
            message:
              "Hosted daily usage state could not be created or loaded.",
          },
        );
      }

      const round =
        createReservedRound({
          entitlement,
          dailyUsage,
          idempotencyKey,
          prompt: input.prompt,
          now,
        });

      const counters =
        reserveCounters(
          entitlement,
          dailyUsage,
        );

      const timestamp =
        now.toISOString();

      const updatedEntitlement = {
        ...counters.entitlement,
        updatedAt: timestamp,
      };

      const updatedDailyUsage = {
        ...counters.dailyUsage,
        updatedAt: timestamp,
      };

      /*
       * The round is new, so no round row lock is required.
       * Creation happens only after the entitlement and daily
       * usage locks have been acquired.
       */
      await repository.createRound(
        round,
      );

      await repository.updateEntitlement(
        updatedEntitlement,
      );

      await repository.updateDailyUsage(
        updatedDailyUsage,
      );

      return {
        round,
        created: true,
      };
    },
  );
}