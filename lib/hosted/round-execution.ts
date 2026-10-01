import { getEnabledHostedEntrants } from "./config";
import {
  SystemHostedClock,
  type HostedClock,
} from "./clock";
import {
  assertAttemptTransition,
  assertExpectedAttemptSlots,
  allAttemptsComplete,
} from "./attempts";
import { HostedError, toHostedError } from "./errors";
import {
  completeCounters,
  validateRoundCompletion,
  markRoundCompleted,
} from "./round-completion";
import {
  markRoundReleased,
  releaseCounters,
  validateRoundRelease,
} from "./round-release";
import {
  assertRoundTransition,
} from "./rounds";
import {
  executeHostedRound,
} from "./orchestrator";
import type {
  HostedRepository,
} from "./repository";
import type {
  HostedProviderRegistry,
} from "./providers";
import type {
  HostedDailyUsage,
  HostedEntitlement,
  HostedRound,
  HostedRoundAttempt,
  HostedProviderResult,
} from "./types";

export type ExecuteHostedRoundInput = {
  repository: HostedRepository;
  registry: HostedProviderRegistry;
  roundId: string;
  clock?: HostedClock;
};

export type ExecuteHostedRoundResult = {
  round: HostedRound;
  attempts: HostedRoundAttempt[];
  results: Array<{
    attemptId: string;
    entrantSlot: 1 | 2;
    provider: string;
    model: string;
    result: HostedProviderResult;
  }>;
  outcome:
    | "completed"
    | "retryable"
    | "failed";
};

type PreparedExecution = {
  round: HostedRound;
  entitlement: HostedEntitlement;
  dailyUsage: HostedDailyUsage;
  attempts: HostedRoundAttempt[];
  executionAttempts: HostedRoundAttempt[];
  entrants: ReturnType<
    typeof getEnabledHostedEntrants
  >;
};

function createRoundAttempts(
  round: HostedRound,
  now: Date,
): HostedRoundAttempt[] {
  const timestamp = now.toISOString();

  return [1, 2].map((slot) => {
    const entrantSlot = slot as 1 | 2;

    return {
      id: crypto.randomUUID(),
      roundId: round.id,
      entrantSlot,
      attemptNumber: 1,
      attemptKey:
        `${round.id}:entrant:${entrantSlot}:attempt:1`,
      provider:
        "gemini" as const,
      model: "",
      providerRequestId: null,
      status: "pending",
      startedAt: null,
      completedAt: null,
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      responseText: null,
      errorCode: null,
      createdAt: timestamp,
    };
  });
}

function configureRoundAttempts(
  attempts: HostedRoundAttempt[],
  round: HostedRound,
  entrants: ReturnType<
    typeof getEnabledHostedEntrants
  >,
): HostedRoundAttempt[] {
  const entrantsBySlot = new Map(
    entrants.map((entrant) => [
      entrant.slot,
      entrant,
    ]),
  );

  return attempts.map((attempt) => {
    const entrant =
      entrantsBySlot.get(
        attempt.entrantSlot,
      );

    if (!entrant) {
      throw new HostedError(
        "PROVIDER_CONFIGURATION_ERROR",
        {
          status: 500,
          message:
            `No Hosted entrant configuration exists for slot ${attempt.entrantSlot}.`,
        },
      );
    }

    if (
      attempt.roundId !== round.id
    ) {
      throw new HostedError(
        "INTERNAL_ERROR",
        {
          status: 500,
          message:
            "Hosted attempt does not belong to the requested round.",
        },
      );
    }

    return {
      ...attempt,
      provider:
        entrant.provider,
      model:
        entrant.model,
    };
  });
}

async function prepareExecution(
  input: ExecuteHostedRoundInput,
  clock: HostedClock,
): Promise<PreparedExecution> {
  return input.repository.executeTransaction(
    async (repository) => {
      const now = clock.now();

      const round =
        await repository.getRoundById(
          input.roundId,
        );

      if (!round) {
        throw new HostedError(
          "ROUND_NOT_FOUND",
          {
            status: 404,
            message:
              "Hosted round was not found.",
          },
        );
      }

      if (
        round.status !== "reserved" &&
        round.status !== "retryable"
      ) {
        throw new HostedError(
          round.status === "completed"
            ? "ROUND_ALREADY_COMPLETED"
            : "ROUND_NOT_EXECUTABLE",
          {
            status: 409,
            message:
              `Hosted round cannot start from status "${round.status}".`,
          },
        );
      }

      const entitlement =
        await repository.getEntitlementById(
          round.entitlementId,
        );

      if (!entitlement) {
        throw new HostedError(
          "ENTITLEMENT_REQUIRED",
          {
            status: 500,
            message:
              "Round entitlement was not found.",
          },
        );
      }

      const dailyUsage =
        await repository.getDailyUsage(
          entitlement.id,
          round.usageDate,
        );

      if (!dailyUsage) {
        throw new HostedError(
          "INTERNAL_ERROR",
          {
            status: 500,
            message:
              "Round daily usage state was not found.",
          },
        );
      }

      const entrants =
        getEnabledHostedEntrants();

      if (entrants.length !== 2) {
        throw new HostedError(
          "PROVIDER_CONFIGURATION_ERROR",
          {
            status: 500,
            message:
              "Hosted execution requires exactly two enabled entrants.",
          },
        );
      }

      let attempts =
        await repository.getRoundAttempts(
          round.id,
        );

      if (attempts.length === 0) {
        attempts = createRoundAttempts(
          round,
          now,
        );

        attempts =
          configureRoundAttempts(
            attempts,
            round,
            entrants,
          );

        for (const attempt of attempts) {
          await repository.createRoundAttempt(
            attempt,
          );
        }
      }

      attempts =
        configureRoundAttempts(
          attempts,
          round,
          entrants,
        );

      assertExpectedAttemptSlots(
        attempts,
        2,
      );

      const executionAttempts =
        attempts.filter(
          (attempt) =>
            attempt.status === "pending" ||
            attempt.status === "retryable",
        );

      if (
        executionAttempts.length === 0
      ) {
        throw new HostedError(
          "ROUND_NOT_EXECUTABLE",
          {
            status: 409,
            message:
              "No runnable Hosted attempts remain.",
          },
        );
      }

      assertRoundTransition(
        round.status,
        "running",
      );

      const timestamp =
        now.toISOString();

      for (const attempt of executionAttempts) {
        assertAttemptTransition(
          attempt.status,
          "running",
        );

        const runningAttempt = {
          ...attempt,
          status: "running" as const,
          startedAt:
            timestamp,
          updatedAt: timestamp,
        } as HostedRoundAttempt & {
          updatedAt?: string;
        };

        const {
          updatedAt: _ignored,
          ...persistableAttempt
        } = runningAttempt;

        await repository.updateRoundAttempt(
          persistableAttempt,
        );
      }

      const runningRound: HostedRound = {
        ...round,
        status: "running",
        startedAt:
          round.startedAt ??
          timestamp,
        updatedAt: timestamp,
      };

      await repository.updateRound(
        runningRound,
      );

      return {
        round: runningRound,
        entitlement,
        dailyUsage,
        attempts:
          await repository.getRoundAttempts(
            round.id,
          ),
        executionAttempts:
          executionAttempts.map(
            (attempt) => ({
              ...attempt,
              status:
                attempt.status,
            }),
          ),
        entrants,
      };
    },
  );
}

function buildAttemptUpdate(
  attempt: HostedRoundAttempt,
  result: HostedProviderResult,
  now: Date,
): HostedRoundAttempt {
  const timestamp =
    now.toISOString();

  const status = result.ok
    ? "completed"
    : result.retryable
      ? "retryable"
      : "failed";

  return {
    ...attempt,
    status,
    providerRequestId:
      result.providerRequestId ??
      null,
    completedAt:
      timestamp,
    latencyMs:
      result.latencyMs,
    inputTokens:
      result.inputTokens ??
      null,
    outputTokens:
      result.outputTokens ??
      null,
    responseText:
      result.text ??
      null,
    errorCode:
      result.errorCode ??
      null,
  };
}

async function persistExecution(
  input: ExecuteHostedRoundInput,
  execution: Awaited<
    ReturnType<typeof executeHostedRound>
  >,
  clock: HostedClock,
): Promise<ExecuteHostedRoundResult> {
  return input.repository.executeTransaction(
    async (repository) => {
      const now = clock.now();

      const round =
        await repository.getRoundById(
          input.roundId,
        );

      if (!round) {
        throw new HostedError(
          "ROUND_NOT_FOUND",
          {
            status: 404,
            message:
              "Hosted round was not found.",
          },
        );
      }

      if (round.status !== "running") {
        throw new HostedError(
          "ROUND_NOT_EXECUTABLE",
          {
            status: 409,
            message:
              `Hosted round cannot accept execution results from status "${round.status}".`,
          },
        );
      }

      const entitlement =
        await repository.getEntitlementById(
          round.entitlementId,
        );

      if (!entitlement) {
        throw new HostedError(
          "ENTITLEMENT_REQUIRED",
          {
            status: 500,
            message:
              "Round entitlement was not found.",
          },
        );
      }

      const dailyUsage =
        await repository.getDailyUsage(
          entitlement.id,
          round.usageDate,
        );

      if (!dailyUsage) {
        throw new HostedError(
          "INTERNAL_ERROR",
          {
            status: 500,
            message:
              "Round daily usage state was not found.",
          },
        );
      }

      const existingAttempts =
        await repository.getRoundAttempts(
          round.id,
        );

      const resultsByAttemptId =
        new Map(
          execution.results.map(
            (result) => [
              result.attemptId,
              result,
            ],
          ),
        );

      for (const attempt of existingAttempts) {
        const result =
          resultsByAttemptId.get(
            attempt.id,
          );

        if (!result) {
          continue;
        }

        const updatedAttempt =
          buildAttemptUpdate(
            attempt,
            result.result,
            now,
          );

        await repository.updateRoundAttempt(
          updatedAttempt,
        );
      }

      const updatedAttempts =
        await repository.getRoundAttempts(
          round.id,
        );

      assertExpectedAttemptSlots(
        updatedAttempts,
        2,
      );

      if (
        allAttemptsComplete(
          updatedAttempts,
          2,
        )
      ) {
        validateRoundCompletion({
          round,
          entitlement,
          dailyUsage,
          attempts:
            updatedAttempts,
          now,
        });

        const counters =
          completeCounters(
            entitlement,
            dailyUsage,
          );

        const completedRound =
          markRoundCompleted(
            round,
            now,
          );

        await repository.updateEntitlement(
          counters.entitlement,
        );

        await repository.updateDailyUsage(
          counters.dailyUsage,
        );

        await repository.updateRound(
          completedRound,
        );

        return {
          round:
            completedRound,
          attempts:
            updatedAttempts,
          results:
            execution.results,
          outcome:
            "completed",
        };
      }

      if (
        execution.outcome ===
        "retryable"
      ) {
        const retryableRound =
          {
            ...round,
            status:
              "retryable" as const,
            updatedAt:
              now.toISOString(),
          };

        assertRoundTransition(
          round.status,
          "retryable",
        );

        await repository.updateRound(
          retryableRound,
        );

        return {
          round:
            retryableRound,
          attempts:
            updatedAttempts,
          results:
            execution.results,
          outcome:
            "retryable",
        };
      }

      const failureCode =
        execution.results.find(
          (result) =>
            result.result.errorCode,
        )?.result.errorCode ??
        "PROVIDER_UNAVAILABLE";

      validateRoundRelease({
        round,
        entitlement,
        dailyUsage,
        now,
        failureCode,
      });

      const counters =
        releaseCounters(
          entitlement,
          dailyUsage,
        );

      const releasedRound =
        markRoundReleased(
          round,
          now,
          failureCode,
        );

      await repository.updateEntitlement(
        counters.entitlement,
      );

      await repository.updateDailyUsage(
        counters.dailyUsage,
      );

      await repository.updateRound(
        releasedRound,
      );

      return {
        round:
          releasedRound,
        attempts:
          updatedAttempts,
        results:
          execution.results,
        outcome:
          "failed",
      };
    },
  );
}

async function releaseUnexpectedExecutionFailure(
  input: ExecuteHostedRoundInput,
  error: unknown,
  clock: HostedClock,
): Promise<ExecuteHostedRoundResult> {
  return input.repository.executeTransaction(
    async (repository) => {
      const now = clock.now();
      const hostedError =
        toHostedError(error);

      const round =
        await repository.getRoundById(
          input.roundId,
        );

      if (!round) {
        throw hostedError;
      }

      const entitlement =
        await repository.getEntitlementById(
          round.entitlementId,
        );

      if (!entitlement) {
        throw hostedError;
      }

      const dailyUsage =
        await repository.getDailyUsage(
          entitlement.id,
          round.usageDate,
        );

      if (!dailyUsage) {
        throw hostedError;
      }

      const attempts =
        await repository.getRoundAttempts(
          round.id,
        );

      for (const attempt of attempts) {
        if (
          attempt.status === "running"
        ) {
          assertAttemptTransition(
            attempt.status,
            "failed",
          );

          await repository.updateRoundAttempt({
            ...attempt,
            status: "failed",
            completedAt:
              now.toISOString(),
            errorCode:
              hostedError.code,
          });
        }
      }

      if (
        round.status ===
        "completed"
      ) {
        return {
          round,
          attempts,
          results: [],
          outcome:
            "completed",
        };
      }

      if (
        round.status ===
        "released"
      ) {
        return {
          round,
          attempts,
          results: [],
          outcome:
            "failed",
        };
      }

      validateRoundRelease({
        round,
        entitlement,
        dailyUsage,
        now,
        failureCode:
          hostedError.code,
      });

      const counters =
        releaseCounters(
          entitlement,
          dailyUsage,
        );

      const releasedRound =
        markRoundReleased(
          round,
          now,
          hostedError.code,
        );

      await repository.updateEntitlement(
        counters.entitlement,
      );

      await repository.updateDailyUsage(
        counters.dailyUsage,
      );

      await repository.updateRound(
        releasedRound,
      );

      return {
        round:
          releasedRound,
        attempts:
          await repository.getRoundAttempts(
            round.id,
          ),
        results: [],
        outcome:
          "failed",
      };
    },
  );
}

export async function executeHostedRoundLifecycle(
  input: ExecuteHostedRoundInput,
): Promise<ExecuteHostedRoundResult> {
  const clock =
    input.clock ??
    new SystemHostedClock();

  const prepared =
    await prepareExecution(
      input,
      clock,
    );

  try {
    const execution =
      await executeHostedRound(
        {
          prompt:
            prepared.round.prompt,
          roundId:
            prepared.round.id,
          attempts:
            prepared.executionAttempts,
          entrants:
            prepared.entrants,
        },
        input.registry,
      );

    return persistExecution(
      input,
      execution,
      clock,
    );
  } catch (error) {
    return releaseUnexpectedExecutionFailure(
      input,
      error,
      clock,
    );
  }
}