import { HostedError } from "./errors";
import type { HostedAccount } from "./types";

export type HostedAuthContext = {
  authSubjectId: string;
  email: string;
  emailVerified: boolean;
};

export function requireAuthenticatedUser(
  context: HostedAuthContext | null | undefined,
): HostedAuthContext {
  if (!context?.authSubjectId) {
    throw new HostedError("ACCOUNT_REQUIRED", {
      status: 401,
      message: "Authentication is required.",
    });
  }

  return context;
}

export function requireVerifiedEmail(
  context: HostedAuthContext,
): void {
  if (!context.emailVerified) {
    throw new HostedError(
      "HOSTED_ELIGIBILITY_REQUIRED",
      {
        status: 403,
        message: "Email verification is required.",
      },
    );
  }
}

export function assertAccountActive(
  account: HostedAccount,
): void {
  if (account.status === "suspended") {
    throw new HostedError("ACCOUNT_SUSPENDED", {
      status: 403,
      message: "This account is suspended.",
    });
  }
}

export function assertAccountOwnership(
  account: HostedAccount,
  authSubjectId: string,
): void {
  if (
    account.authSubjectId !== authSubjectId
  ) {
    throw new HostedError("ROUND_NOT_OWNED", {
      status: 403,
      message: "The requested resource is not owned by this account.",
    });
  }
}