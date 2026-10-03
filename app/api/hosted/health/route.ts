import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROBE_ID =
  "__ai_arena_hosted_runtime_probe__";

const PROBE_DATE = "2099-01-01";

export async function GET() {
  try {
    const repository =
      createNeonHostedRepository();

    await repository.executeTransaction(
      async (transactionRepository) => {
        await transactionRepository.getAccountByAuthSubjectId(
          PROBE_ID,
        );

        await transactionRepository.getPaymentByProviderReference(
          PROBE_ID,
          PROBE_ID,
        );

        await transactionRepository.getEntitlementById(
          PROBE_ID,
        );

        await transactionRepository.getDailyUsage(
          PROBE_ID,
          PROBE_DATE,
        );

        await transactionRepository.getRoundById(
          PROBE_ID,
        );

        await transactionRepository.getRoundAttempts(
          PROBE_ID,
        );

        await transactionRepository.getWebhookEvent(
          PROBE_ID,
          PROBE_ID,
        );
      },
    );

    return NextResponse.json(
      {
        ok: true,
        hostedDatabase: "connected",
        hostedSchema: "reachable",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        hostedDatabase: "unreachable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}