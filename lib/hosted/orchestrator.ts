import { HostedError } from "./errors";
import {
  assertExpectedAttemptSlots,
  allAttemptsComplete,
  hasFailedAttempt,
  hasRetryableAttempt,
} from "./attempts";
import {
  getHostedProvider,
  type HostedProviderRegistry,
} from "./providers";
import type {
  HostedEntrantConfig,
  HostedProviderResult,
  HostedRoundAttempt,
} from "./types";

export type HostedExecutionInput = {
  prompt: string;
  roundId: string;
  attempts: HostedRoundAttempt[];
  entrants: HostedEntrantConfig[];
};

export type HostedExecutionResult = {
  results: Array<{
    attemptId: string;
    entrantSlot: 1 | 2;
    provider: HostedEntrantConfig["provider"];
    model: string;
    result: HostedProviderResult;
  }>;
  outcome:
    | "completed"
    | "retryable"
    | "failed";
};

export async function executeHostedRound(
  input: HostedExecutionInput,
  registry: HostedProviderRegistry,
): Promise<HostedExecutionResult> {
  assertExpectedAttemptSlots(
    input.attempts,
    2,
  );

  if (input.entrants.length !== 2) {
    throw new HostedError(
      "INVALID_PROVIDER_RESULT",
      {
        status: 500,
        message:
          "Hosted rounds require exactly two entrants.",
      },
    );
  }

  if (!input.prompt.trim()) {
    throw new HostedError(
      "INVALID_PROVIDER_RESULT",
      {
        status: 400,
        message:
          "Hosted execution requires a prompt.",
      },
    );
  }

  const entrantBySlot = new Map(
    input.entrants.map((entrant) => [
      entrant.slot,
      entrant,
    ]),
  );

  const executionResults = await Promise.all(
    input.attempts.map(async (attempt) => {
      const entrant = entrantBySlot.get(
        attempt.entrantSlot,
      );

      if (!entrant || !entrant.enabled) {
        throw new HostedError(
          "PROVIDER_CONFIGURATION_ERROR",
          {
            status: 500,
            message:
              `No enabled provider configuration exists for entrant slot ${attempt.entrantSlot}.`,
          },
        );
      }

      const provider = getHostedProvider(
        registry,
        entrant.provider,
      );

      const result =
        await provider.generate({
          prompt: input.prompt,
          roundId: input.roundId,
          attemptId: attempt.id,
          requestId: attempt.attemptKey,
        });

      return {
        attemptId: attempt.id,
        entrantSlot: attempt.entrantSlot,
        provider: entrant.provider,
        model: entrant.model,
        result,
      };
    }),
  );

  const normalizedAttempts:
    HostedRoundAttempt[] =
    input.attempts.map((attempt) => {
      const execution =
        executionResults.find(
          (result) =>
            result.attemptId ===
            attempt.id,
        );

      if (!execution) {
        return attempt;
      }

      return {
        ...attempt,
        status: execution.result.ok
          ? "completed"
          : execution.result.retryable
            ? "retryable"
            : "failed",
        providerRequestId:
          execution.result
            .providerRequestId ??
          null,
        latencyMs:
          execution.result.latencyMs,
        inputTokens:
          execution.result
            .inputTokens ??
          null,
        outputTokens:
          execution.result
            .outputTokens ??
          null,
        responseText:
          execution.result.text ??
          null,
        errorCode:
          execution.result.errorCode ??
          null,
      };
    });

  if (
    allAttemptsComplete(
      normalizedAttempts,
      2,
    )
  ) {
    return {
      results: executionResults,
      outcome: "completed",
    };
  }

  if (
    hasRetryableAttempt(
      normalizedAttempts,
    )
  ) {
    return {
      results: executionResults,
      outcome: "retryable",
    };
  }

  if (
    hasFailedAttempt(
      normalizedAttempts,
    )
  ) {
    return {
      results: executionResults,
      outcome: "failed",
    };
  }

  throw new HostedError(
    "INVALID_PROVIDER_RESULT",
    {
      status: 500,
      message:
        "Provider execution produced an invalid round state.",
    },
  );
}