import "server-only";

import {
  createHostedAccount,
} from "./account";
import {
  HostedError,
} from "./errors";
import type {
  HostedRepository,
} from "./repository";
import type {
  HostedAccount,
} from "./types";

export type GetOrCreateHostedAccountInput = {
  repository: HostedRepository;
  authSubjectId: string;
  email: string;
  emailVerifiedAt?: Date | null;
  now: Date;
};

function isUniqueViolation(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  const code = (
    error as {
      code?: unknown;
    }
  ).code;

  return code === "23505";
}

function validateIdentity(
  authSubjectId: string,
  email: string,
): {
  authSubjectId: string;
  email: string;
} {
  const normalizedSubject =
    authSubjectId.trim();

  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedSubject) {
    throw new HostedError(
      "ACCOUNT_REQUIRED",
      {
        status: 400,
        message:
          "Authentication subject ID is required.",
      },
    );
  }

  if (!normalizedEmail) {
    throw new HostedError(
      "ACCOUNT_REQUIRED",
      {
        status: 400,
        message:
          "Email address is required.",
      },
    );
  }

  return {
    authSubjectId:
      normalizedSubject,
    email:
      normalizedEmail,
  };
}

async function findExistingAccount(
  repository: HostedRepository,
  authSubjectId: string,
): Promise<HostedAccount> {
  const account =
    await repository.getAccountByAuthSubjectId(
      authSubjectId,
    );

  if (!account) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Hosted account creation reported a uniqueness conflict, but no existing account could be loaded.",
        retryable: true,
      },
    );
  }

  return account;
}

export async function getOrCreateHostedAccount(
  input: GetOrCreateHostedAccountInput,
): Promise<HostedAccount> {
  const identity =
    validateIdentity(
      input.authSubjectId,
      input.email,
    );

  try {
    return await input.repository.executeTransaction(
      async (repository) => {
        const existingAccount =
          await repository.getAccountByAuthSubjectId(
            identity.authSubjectId,
          );

        if (existingAccount) {
          return existingAccount;
        }

        const account =
          createHostedAccount({
            authSubjectId:
              identity.authSubjectId,
            email:
              identity.email,
            emailVerifiedAt:
              input.emailVerifiedAt ??
              null,
            now: input.now,
          });

        return repository.saveAccount(
          account,
        );
      },
    );
  } catch (error) {
    /*
     * Two concurrent first requests can both observe
     * "no account" and race to INSERT. The unique
     * auth_subject_id constraint lets exactly one win.
     *
     * Only recover from that specific uniqueness race.
     * Every other database/application error must propagate.
     */
    if (!isUniqueViolation(error)) {
      throw error;
    }

    return findExistingAccount(
      input.repository,
      identity.authSubjectId,
    );
  }
}