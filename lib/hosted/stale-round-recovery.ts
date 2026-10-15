import { SystemHostedClock } from "./clock";
import type { HostedClock } from "./clock";
import { assertAttemptTransition, assertExpectedAttemptSlots } from "./attempts";
import { HostedError } from "./errors";
import type { HostedRepository } from "./repository";
import { assertRoundTransition } from "./rounds";
import type { HostedRound } from "./types";

export const STALE_RUNNING_ROUND_THRESHOLD_MS =
  2 * 60 * 1000;

export type RecoverStaleHostedRoundInput = {
  repository: HostedRepository;
  roundId: string;
  clock?: HostedClock;
};

export type RecoverStaleHostedRoundResult = {
  round: HostedRound;
  recovered: boolean;
};

export async function recoverStaleHostedRound(
  input: RecoverStaleHostedRoundInput,
): Promise<RecoverStaleHostedRoundResult> {
  const clock =
    input.clock ?? new SystemHostedClock();

  return input.repository.executeTransaction(
    async (repository) => {
      /*
       * Preserve the established lock order:
       *
       * entitlement -> daily usage -> round -> attempts
       */
      const discoveredRound =
        await repository.getRoundById(
          input.roundId,
        );

      if (!discoveredRound) {
        throw new HostedError("ROUND_NOT_FOUND", {
          status: 404,
          message: "Hosted round was not found.",
        });
      }

      const entitlement =
        await repository.getEntitlementById(
          discoveredRound.entitlementId,
          { forUpdate: true },
        );

      if (!entitlement) {
        throw new HostedError("ENTITLEMENT_REQUIRED", {
          status: 500,
          message: "Round entitlement was not found.",
        });
      }

      const dailyUsage =
        await repository.getDailyUsage(
          entitlement.id,
          discoveredRound.usageDate,
          { forUpdate: true },
        );

      if (!dailyUsage) {
        throw new HostedError("INTERNAL_ERROR", {
          status: 500,
          message:
            "Round daily usage state was not found.",
        });
      }

      const round =
        await repository.getRoundById(
          input.roundId,
          { forUpdate: true },
        );

      if (!round) {
        throw new HostedError("ROUND_NOT_FOUND", {
          status: 404,
          message: "Hosted round was not found.",
        });
      }

      if (
        round.entitlementId !== entitlement.id ||
        round.usageDate !== dailyUsage.usageDate
      ) {
        throw new HostedError("INTERNAL_ERROR", {
          status: 500,
          message:
            "Round ownership or usage state is inconsistent.",
        });
      }

      /*
       * Another request may already have recovered or completed
       * this round while this transaction waited for its locks.
       */
      if (round.status !== "running") {
        return {
          round,
          recovered: false,
        };
      }

      const now = clock.now();
      const lastUpdatedAt = Date.parse(
        round.updatedAt,
      );

      if (
        !Number.isFinite(lastUpdatedAt) ||
        now.getTime() - lastUpdatedAt <
          STALE_RUNNING_ROUND_THRESHOLD_MS
      ) {
        return {
          round,
          recovered: false,
        };
      }

      const attempts =
        await repository.getRoundAttempts(
          round.id,
          { forUpdate: true },
        );

      assertExpectedAttemptSlots(attempts, 2);

      const unfinishedAttempts =
        attempts.filter(
          (attempt) => attempt.status === "running",
        );

      /*
       * Do not guess how to repair an unexpected state where
       * the round is running but no entrant is running.
       */
      if (unfinishedAttempts.length === 0) {
        return {
          round,
          recovered: false,
        };
      }

      const timestamp = now.toISOString();

      for (const attempt of unfinishedAttempts) {
        assertAttemptTransition(
          attempt.status,
          "retryable",
        );

        await repository.updateRoundAttempt({
          ...attempt,
          status: "retryable",
          completedAt: timestamp,
          errorCode: "PROVIDER_TIMEOUT",
        });
      }

      assertRoundTransition(
        round.status,
        "retryable",
      );

      const retryableRound: HostedRound = {
        ...round,
        status: "retryable",
        failureCode: "PROVIDER_TIMEOUT",
        updatedAt: timestamp,
      };

      await repository.updateRound(retryableRound);

      return {
        round: retryableRound,
        recovered: true,
      };
    },
  );
}