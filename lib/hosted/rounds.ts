import { HostedError } from "./errors";
import type { HostedRound, RoundStatus } from "./types";

const allowedTransitions: Record<
  RoundStatus,
  readonly RoundStatus[]
> = {
  reserved: ["running", "released"],
  running: ["completed", "retryable", "failed", "released"],
  retryable: ["running", "released"],
  completed: [],
  failed: [],
  released: [],
};

export function canTransitionRound(
  from: RoundStatus,
  to: RoundStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertRoundTransition(
  from: RoundStatus,
  to: RoundStatus,
): void {
  if (!canTransitionRound(from, to)) {
    throw new HostedError("ROUND_NOT_EXECUTABLE", {
      status: 409,
      message: `Invalid round transition: ${from} -> ${to}.`,
    });
  }
}

export function assertRoundReservable(
  round: HostedRound,
): void {
  if (round.status !== "reserved") {
    throw new HostedError("ROUND_NOT_EXECUTABLE", {
      status: 409,
      message: `Round cannot be executed from status "${round.status}".`,
    });
  }
}

export function assertRoundCompletable(
  round: HostedRound,
): void {
  if (round.status !== "running") {
    if (round.status === "completed") {
      throw new HostedError("ROUND_ALREADY_COMPLETED", {
        status: 409,
      });
    }

    throw new HostedError("ROUND_NOT_EXECUTABLE", {
      status: 409,
      message: `Round cannot be completed from status "${round.status}".`,
    });
  }
}

export function assertRoundReleasable(
  round: HostedRound,
): void {
  if (
    round.status === "completed" ||
    round.status === "released"
  ) {
    throw new HostedError("ROUND_NOT_EXECUTABLE", {
      status: 409,
      message: `Round cannot be released from status "${round.status}".`,
    });
  }
}

export function isRoundTerminal(
  status: RoundStatus,
): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "released"
  );
}