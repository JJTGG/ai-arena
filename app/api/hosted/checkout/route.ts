import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import {
  assertHostedEligibility,
} from "@/lib/hosted/eligibility";
import { hostedErrorResponse } from "@/lib/hosted/errors";
import {
  PaystackHostedPaymentProvider,
} from "@/lib/hosted/paystack";
import { createHostedCheckout } from "@/lib/hosted/checkout";
import {
  getRequestCountry,
} from "@/lib/hosted/geo";
import {
  resolveHostedSession,
} from "@/lib/hosted/session-service";
import {
  SystemHostedClock,
} from "@/lib/hosted/clock";
import type { HostedPayment } from "@/lib/hosted/types";

export async function POST(
  request: Request,
) {
  try {
    const authContext =
      await getHostedAuthContext();

    const repository =
      createNeonHostedRepository();

    const clock =
      new SystemHostedClock();

    const {
      account,
    } =
      await resolveHostedSession({
        repository,
        authContext,
        clock,
      });

    assertHostedEligibility(
      account,
      authContext!,
    );

    const activeEntitlement =
      await repository.getActiveEntitlement(
        account.id,
      );

    if (activeEntitlement) {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        checkoutUrl: null,
      });
    }

    const countryCode =
      getRequestCountry(
        request.headers,
      );

    const checkout =
      createHostedCheckout(
        account.id,
        {
          pricingContext: {
            countryCode,
          },
        },
        clock.now(),
      );

    const paymentReference =
      `AA-HOSTED-${checkout.id}`;

    const payment: HostedPayment = {
      id: crypto.randomUUID(),
      accountId: account.id,
      provider: "paystack",
      providerPaymentReference:
        paymentReference,
      providerTransactionReference:
        null,
      checkoutReference:
        checkout.id,
      amountMinor:
        checkout.amountMinor,
      currency:
        checkout.currency,
      status: "pending",
      createdAt:
        checkout.createdAt,
      confirmedAt:
        null,
      reversedAt:
        null,
    };

    await repository.createPayment(
      payment,
    );

    const paymentProvider =
      new PaystackHostedPaymentProvider();

    const result =
      await paymentProvider.initializePayment({
        payment,
        customerEmail:
          account.email,
        redirectUrl:
          new URL(
            "/hosted",
            request.url,
          ).toString(),
        paymentDescription:
          "AI Arena Hosted access — 60 rounds, 30 days",
      });

    await repository.updatePayment({
      ...payment,
      providerTransactionReference:
        result.providerTransactionReference,
    });

    return NextResponse.json({
      ok: true,
      alreadyActive: false,
      checkoutUrl:
        result.checkoutUrl,
      paymentReference,
      currency:
        checkout.currency,
      amountMinor:
        checkout.amountMinor,
    });
  } catch (error) {
    console.error(
      "[HOSTED ARENA] Checkout initialization failed:",
      error,
    );

    return hostedErrorResponse(
      error,
    );
  }
}
