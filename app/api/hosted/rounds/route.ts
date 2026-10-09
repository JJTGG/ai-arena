import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import { getHostedProviderRegistry } from "@/lib/hosted/provider-registry";
import { reserveHostedRound } from "@/lib/hosted/round-reservation-service";
import { executeHostedRoundLifecycle } from "@/lib/hosted/round-execution";
import { resolveHostedSession } from "@/lib/hosted/session-service";
import {
  getDailyRoundsRemaining,
  getRoundsRemaining,
} from "@/lib/hosted/entitlement";
import {
  HostedError,
  toHostedError,
} from "@/lib/hosted/errors";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_PROMPT_LENGTH = 20_000;

type RoundRequest = {
  prompt?: unknown;
  idempotencyKey?: unknown;
};

function respondWithError(error: unknown) {
  const hostedError = toHostedError(error);

  const message =
    hostedError.code === "PROVIDER_CONFIGURATION_ERROR"
      ? "Hosted Arena is temporarily unavailable while its battle services are being configured."
      : hostedError.message;

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: hostedError.code,
        message,
        retryable: hostedError.retryable,
      },
    },
    {
      status: hostedError.status,
    },
  );
}

export async function POST(request: Request) {
  try {
    const authContext = await getHostedAuthContext();

    if (!authContext) {
      throw new HostedError("ACCOUNT_REQUIRED", {
        status: 401,
        message: "Sign in to enter Hosted Arena.",
      });
    }

    const repository = createNeonHostedRepository();

    const { account } = await resolveHostedSession({
      repository,
      authContext,
    });

    if (!account.emailVerifiedAt) {
      throw new HostedError("HOSTED_ELIGIBILITY_REQUIRED", {
        status: 403,
        message: "Verify your email before starting a round.",
      });
    }

    if (!account.ageConfirmedAt) {
      throw new HostedError("HOSTED_ELIGIBILITY_REQUIRED", {
        status: 403,
        message: "Confirm that you are 18 or older before starting a round.",
      });
    }

    let body: RoundRequest;

    try {
      body = (await request.json()) as RoundRequest;
    } catch {
      throw new HostedError("INVALID_PROVIDER_RESULT", {
        status: 400,
        message: "The request body must contain valid JSON.",
      });
    }

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const idempotencyKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (!prompt) {
      throw new HostedError("INVALID_PROVIDER_RESULT", {
        status: 400,
        message: "Enter a prompt before starting a round.",
      });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new HostedError("INVALID_PROVIDER_RESULT", {
        status: 400,
        message: "Your prompt exceeds the maximum allowed length.",
      });
    }

    if (
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 200
    ) {
      throw new HostedError("IDEMPOTENCY_CONFLICT", {
        status: 400,
        message: "A valid round request identifier is required.",
      });
    }

    /*
     * Check configuration before reserving a round.
     * Missing credentials must not consume a customer's allowance.
     */
    if (
      !process.env.HOSTED_GEMINI_API_KEY?.trim() ||
      !process.env.HOSTED_GROQ_API_KEY?.trim()
    ) {
      throw new HostedError("PROVIDER_CONFIGURATION_ERROR", {
        status: 503,
        message: "Hosted battle services are not configured.",
        retryable: true,
      });
    }

    const registry = getHostedProviderRegistry();

    const reservation = await reserveHostedRound({
      repository,
      accountId: account.id,
      idempotencyKey,
      prompt,
    });

    let execution:
      | Awaited<ReturnType<typeof executeHostedRoundLifecycle>>
      | null = null;

    /*
     * Execute newly reserved rounds and retryable rounds.
     * Existing completed rounds are returned without re-execution.
     */
    if (
      reservation.round.status === "reserved" ||
      reservation.round.status === "retryable"
    ) {
      execution = await executeHostedRoundLifecycle({
        repository,
        registry,
        roundId: reservation.round.id,
      });
    }

    const round =
      execution?.round ??
      (await repository.getRoundById(
        reservation.round.id,
      ));

    if (!round) {
      throw new HostedError("ROUND_NOT_FOUND", {
        status: 500,
        message: "The round could not be loaded.",
        retryable: true,
      });
    }

    const attempts =
      execution?.attempts ??
      (await repository.getRoundAttempts(round.id));

    const entitlement =
      await repository.getEntitlementById(
        round.entitlementId,
      );

    const dailyUsage = entitlement
      ? await repository.getDailyUsage(
          entitlement.id,
          round.usageDate,
        )
      : null;

    /*
     * Do not expose provider IDs, model names, API credentials,
     * or provider request IDs to the customer.
     */
    return NextResponse.json({
      ok: true,

      round: {
        id: round.id,
        prompt: round.prompt,
        status: round.status,
        reservedAt: round.reservedAt,
        startedAt: round.startedAt,
        completedAt: round.completedAt,
        releasedAt: round.releasedAt,
        failureCode: round.failureCode,
      },

      entrants: attempts.map((attempt) => ({
        slot: attempt.entrantSlot,
        label: `Entrant ${String(attempt.entrantSlot).padStart(2, "0")}`,
        status: attempt.status,
        response: attempt.responseText,
        latencyMs: attempt.latencyMs,
        errorCode: attempt.errorCode,
      })),

      usage:
        entitlement && dailyUsage
          ? {
              totalRoundsRemaining:
                getRoundsRemaining(entitlement),
              dailyRoundsRemaining:
                getDailyRoundsRemaining(
                  entitlement,
                  dailyUsage,
                ),
              totalRounds: entitlement.totalRounds,
              dailyLimit: entitlement.dailyLimit,
              completedRounds:
                entitlement.completedRounds,
            }
          : null,
    });
  } catch (error) {
    return respondWithError(error);
  }
}