
import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import { resolveHostedSession } from "@/lib/hosted/session-service";
import { isEntitlementActive, getDailyRoundsRemaining, getRoundsRemaining } from "@/lib/hosted/entitlement";
import { getDateKeyInTimeZone } from "@/lib/hosted/clock";
import { HostedError, toHostedError } from "@/lib/hosted/errors";

export const runtime = "nodejs";

function respondWithError(error: unknown) {
  const hostedError = toHostedError(error);

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: hostedError.code,
        message: hostedError.message,
        retryable: hostedError.retryable,
      },
    },
    { status: hostedError.status },
  );
}

export async function GET() {
  try {
    const authContext = await getHostedAuthContext();

    if (!authContext) {
      throw new HostedError("ACCOUNT_REQUIRED", {
        status: 401,
        message: "Sign in to view Hosted Arena history.",
      });
    }

    const repository = createNeonHostedRepository();

    const { account } = await resolveHostedSession({
      repository,
      authContext,
    });

    if (!account.emailVerifiedAt || !account.ageConfirmedAt) {
      throw new HostedError("HOSTED_ELIGIBILITY_REQUIRED", {
        status: 403,
        message: "Verify your email and confirm your age to view Hosted Arena history.",
      });
    }

    const entitlement =
      await repository.getActiveEntitlement(account.id);

    if (!entitlement) {
      throw new HostedError("ENTITLEMENT_REQUIRED", {
        status: 403,
        message: "An active Hosted Arena entitlement is required.",
      });
    }

    const now = new Date();

    if (!isEntitlementActive(entitlement, now)) {
      throw new HostedError("ENTITLEMENT_EXPIRED", {
        status: 403,
        message: "Your Hosted Arena entitlement is not active.",
      });
    }

    const rounds =
      await repository.listRoundsForEntitlement(
        entitlement.id,
        60,
      );

    const history = await Promise.all(
      rounds.map(async (round) => {
        const attempts =
          await repository.getRoundAttempts(round.id);

        return {
          round: {
            id: round.id,
            prompt: round.prompt,
            status: round.status,
            reservedAt: round.reservedAt,
            startedAt: round.startedAt,
            completedAt: round.completedAt,
            releasedAt: round.releasedAt,
            failureCode: round.failureCode,
            createdAt: round.createdAt,
          },

          entrants: attempts.map((attempt) => ({
            slot: attempt.entrantSlot,
            label: `Entrant ${String(
              attempt.entrantSlot,
            ).padStart(2, "0")}`,
            status: attempt.status,
            response: attempt.responseText,
            latencyMs: attempt.latencyMs,
            errorCode: attempt.errorCode,
          })),
        };
      }),
    );

    const usageDate = getDateKeyInTimeZone(
      now,
      entitlement.usageTimezone,
    );

    const dailyUsage = await repository.getDailyUsage(
      entitlement.id,
      usageDate,
    );

    return NextResponse.json(
      {
        ok: true,
        rounds: history,
        usage: {
          totalRoundsRemaining:
            getRoundsRemaining(entitlement),
          dailyRoundsRemaining: dailyUsage
            ? getDailyRoundsRemaining(
                entitlement,
                dailyUsage,
              )
            : entitlement.dailyLimit,
          totalRounds: entitlement.totalRounds,
          dailyLimit: entitlement.dailyLimit,
          completedRounds: entitlement.completedRounds,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return respondWithError(error);
  }
}
