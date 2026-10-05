import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import { resolveHostedSession } from "@/lib/hosted/session-service";
import { SystemHostedClock } from "@/lib/hosted/clock";

export async function POST() {
  try {
    const authContext = await getHostedAuthContext();

    if (!authContext) {
      return NextResponse.json(
        {
          ok: false,
          error: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    const repository = createNeonHostedRepository();
    const clock = new SystemHostedClock();

    const { account } = await resolveHostedSession({
      repository,
      authContext,
      clock,
    });

    if (!account.emailVerifiedAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMAIL_VERIFICATION_REQUIRED",
        },
        { status: 403 },
      );
    }

    if (account.ageConfirmedAt) {
      return NextResponse.json({
        ok: true,
        ageConfirmed: true,
      });
    }

    await repository.saveAccount({
      ...account,
      ageConfirmedAt: clock.now().toISOString(),
      updatedAt: clock.now().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      ageConfirmed: true,
    });
  } catch (error) {
    console.error("[HOSTED ARENA] Age confirmation failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "AGE_CONFIRMATION_FAILED",
      },
      { status: 500 },
    );
  }
}
