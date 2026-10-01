import { HostedError } from "./errors";
import type {
  HostedAccount,
  AccountStatus,
} from "./types";

export type CreateHostedAccountInput = {
  authSubjectId: string;
  email: string;
  emailVerifiedAt?: Date | null;
  now: Date;
};

export function createHostedAccount(
  input: CreateHostedAccountInput,
): HostedAccount {
  const authSubjectId = input.authSubjectId.trim();
  const email = input.email.trim().toLowerCase();

  if (!authSubjectId) {
    throw new HostedError("ACCOUNT_REQUIRED", {
      status: 400,
      message: "Authentication subject ID is required.",
    });
  }

  if (!email) {
    throw new HostedError("ACCOUNT_REQUIRED", {
      status: 400,
      message: "Email address is required.",
    });
  }

  const timestamp = input.now.toISOString();

  return {
    id: crypto.randomUUID(),
    authSubjectId,
    email,
    emailVerifiedAt:
      input.emailVerifiedAt?.toISOString() ?? null,
    ageConfirmedAt: null,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateEmailVerification(
  account: HostedAccount,
  emailVerifiedAt: Date | null,
  now: Date,
): HostedAccount {
  return {
    ...account,
    emailVerifiedAt:
      emailVerifiedAt?.toISOString() ?? null,
    updatedAt: now.toISOString(),
  };
}

export function confirmAge(
  account: HostedAccount,
  now: Date,
): HostedAccount {
  if (account.status === "suspended") {
    throw new HostedError("ACCOUNT_SUSPENDED", {
      status: 403,
    });
  }

  return {
    ...account,
    ageConfirmedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function updateAccountStatus(
  account: HostedAccount,
  status: AccountStatus,
  now: Date,
): HostedAccount {
  if (status === account.status) {
    return account;
  }

  return {
    ...account,
    status,
    updatedAt: now.toISOString(),
  };
}

export function assertAccountEmail(
  account: HostedAccount,
  email: string,
): void {
  if (
    account.email !==
    email.trim().toLowerCase()
  ) {
    throw new HostedError("ACCOUNT_REQUIRED", {
      status: 409,
      message:
        "The authenticated email does not match the Hosted account.",
    });
  }
}