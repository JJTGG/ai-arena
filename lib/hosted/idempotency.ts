import { HostedError } from "./errors";

const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

export function requireIdempotencyKey(
  value: string | null | undefined,
): string {
  if (!value) {
    throw new HostedError("IDEMPOTENCY_CONFLICT", {
      status: 400,
      message: "Idempotency-Key is required.",
    });
  }

  const key = value.trim();

  if (!key) {
    throw new HostedError("IDEMPOTENCY_CONFLICT", {
      status: 400,
      message: "Idempotency-Key cannot be empty.",
    });
  }

  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new HostedError("IDEMPOTENCY_CONFLICT", {
      status: 400,
      message: "Idempotency-Key is too long.",
    });
  }

  return key;
}

export function normalizeIdempotencyKey(
  value: string,
): string {
  return value.trim();
}

export function assertSameIdempotencyOperation(
  existingKey: string,
  requestedKey: string,
): void {
  if (
    normalizeIdempotencyKey(existingKey) !==
    normalizeIdempotencyKey(requestedKey)
  ) {
    throw new HostedError("IDEMPOTENCY_CONFLICT", {
      status: 409,
      message: "Idempotency key conflicts with an existing operation.",
    });
  }
}