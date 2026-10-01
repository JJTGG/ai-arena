import { HostedError } from "./errors";
import type { AttemptStatus, HostedRoundAttempt } from "./types";

const allowedTransitions: Record<
  AttemptStatus,
  readonly AttemptStatus[]
> = {
  pending: ["running"],
  running: ["completed", "retryable", "failed"],
  completed: [],
  retryable: ["running", "failed"],
  failed: [],
};

export function canTransitionAttempt(
  from: AttemptStatus,
  to: AttemptStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertAttemptTransition(
  from: AttemptStatus,
  to: AttemptStatus,
): void {
  if (!canTransitionAttempt(from, to)) {
    throw new HostedError("ROUND_NOT_EXECUTABLE", {
      status: 409,
      message: `Invalid attempt transition: ${from} -> ${to}.`,
    });
  }
}

export function assertAttemptRunnable(
  attempt: HostedRoundAttempt,
): void {
  if (
    attempt.status !== "pending" &&
    attempt.status !== "retryable"
  ) {
    throw new HostedError("ROUND_NOT_EXECUTABLE", {
      status: 409,
      message: `Attempt cannot run from status "${attempt.status}".`,
    });
  }
}

export function isAttemptComplete(
  attempt: HostedRoundAttempt,
): boolean {
  return attempt.status === "completed";
}

export function hasRetryableAttempt(
  attempts: HostedRoundAttempt[],
): boolean {
  return attempts.some(
    (attempt) => attempt.status === "retryable",
  );
}

export function allAttemptsComplete(
  attempts: HostedRoundAttempt[],
  expectedCount = 2,
): boolean {
  return (
    attempts.length === expectedCount &&
    attempts.every(isAttemptComplete)
  );
}

export function hasFailedAttempt(
  attempts: HostedRoundAttempt[],
): boolean {
  return attempts.some(
    (attempt) => attempt.status === "failed",
  );
}

export function assertExpectedAttemptSlots(
  attempts: HostedRoundAttempt[],
  expectedCount = 2,
): void {
  if (attempts.length !== expectedCount) {
    throw new HostedError("INVALID_PROVIDER_RESULT", {
      status: 500,
      message: `Expected ${expectedCount} attempts, received ${attempts.length}.`,
    });
  }

  const slots = new Set(
    attempts.map((attempt) => attempt.entrantSlot),
  );

  if (slots.size !== expectedCount) {
    throw new HostedError("INVALID_PROVIDER_RESULT", {
      status: 500,
      message: "Each entrant slot must be represented exactly once.",
    });
  }
}