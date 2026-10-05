import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import {
  PaystackHostedPaymentProvider,
  verifyPaystackWebhookSignature,
} from "@/lib/hosted/paystack";
import {
  confirmHostedPayment,
} from "@/lib/hosted/payment-confirmation-service";
import {
  verifyHostedPaymentWebhook,
  type HostedPaymentWebhook,
} from "@/lib/hosted/webhooks";
import {
  SystemHostedClock,
} from "@/lib/hosted/clock";

export const runtime = "nodejs";

type PaystackWebhookPayload = {
  event?: unknown;
  data?: {
    id?: unknown;
    reference?: unknown;
    metadata?: unknown;
  };
};

function getSecretKey(): string {
  const secretKey =
    process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is required.",
    );
  }

  return secretKey;
}

function getString(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function getCheckoutReference(
  metadata: unknown,
): string | null {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const value = (
    metadata as Record<string, unknown>
  ).checkoutReference;

  return getString(value);
}

function getEventId(
  value: unknown,
): string | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value)
  ) {
    return String(value);
  }

  return getString(value);
}

export async function POST(
  request: Request,
) {
  const rawBody = await request.text();

  const signature =
    request.headers.get(
      "x-paystack-signature",
    )?.trim() ?? "";

  if (!signature) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Paystack signature.",
      },
      { status: 401 },
    );
  }

  let secretKey: string;

  try {
    secretKey = getSecretKey();
  } catch (error) {
    console.error(
      "[AI ARENA] Paystack webhook configuration error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook configuration error.",
      },
      { status: 500 },
    );
  }

  if (
    !verifyPaystackWebhookSignature(
      rawBody,
      signature,
      secretKey,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid Paystack signature.",
      },
      { status: 401 },
    );
  }

  let payload: PaystackWebhookPayload;

  try {
    payload =
      JSON.parse(
        rawBody,
      ) as PaystackWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid webhook JSON.",
      },
      { status: 400 },
    );
  }

  const eventType =
    getString(payload.event);

  if (!eventType) {
    return NextResponse.json(
      {
        ok: false,
        error: "Webhook event type is required.",
      },
      { status: 400 },
    );
  }

  if (eventType !== "charge.success") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      event: eventType,
    });
  }

  const data = payload.data;

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "Paystack webhook data is required.",
      },
      { status: 400 },
    );
  }

  const providerPaymentReference =
    getString(data.reference);

  if (!providerPaymentReference) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Paystack payment reference is required.",
      },
      { status: 400 },
    );
  }

  const providerEventId =
    getEventId(data.id);

  if (!providerEventId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Paystack webhook event ID is required.",
      },
      { status: 400 },
    );
  }

  const event: HostedPaymentWebhook = {
    provider: "paystack",
    providerEventId,
    providerPaymentReference,
    checkoutReference:
      getCheckoutReference(data.metadata),
    receivedAt: new Date(),
    signature,
    rawBody,
  };

  try {
    const repository =
      createNeonHostedRepository();

    const paymentProvider =
      new PaystackHostedPaymentProvider();

    const verified =
      await verifyHostedPaymentWebhook(
        {
          verify: (incomingEvent) =>
            paymentProvider.verifyWebhook(
              incomingEvent,
            ),
        },
        event,
      );

    const result =
      await confirmHostedPayment({
        repository,
        event:
          verified.event,
        payment:
          verified.payment,
        usageTimezone: "UTC",
        clock:
          new SystemHostedClock(),
      });

    return NextResponse.json({
      ok: true,
      alreadyProcessed:
        result.alreadyProcessed,
      entitlementCreated:
        Boolean(result.entitlement),
    });
  } catch (error) {
    console.error(
      "[AI ARENA] Paystack webhook processing failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
