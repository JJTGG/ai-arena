import "server-only";

import {
  assertAccountEmail,
} from "./account";
import {
  assertAccountActive,
  type HostedAuthContext,
  requireAuthenticatedUser,
} from "./auth";
import {
  getOrCreateHostedAccount,
} from "./account-service";
import type {
  HostedRepository,
} from "./repository";
import type {
  HostedAccount,
} from "./types";
import {
  SystemHostedClock,
  type HostedClock,
} from "./clock";

export type ResolveHostedSessionInput = {
  repository: HostedRepository;
  authContext: HostedAuthContext | null | undefined;
  clock?: HostedClock;
};

export type HostedSession = {
  auth: HostedAuthContext;
  account: HostedAccount;
};

export async function resolveHostedSession(
  input: ResolveHostedSessionInput,
): Promise<HostedSession> {
  const auth =
    requireAuthenticatedUser(
      input.authContext,
    );

  assertAccountEmailInput(auth.email);

  const clock =
    input.clock ??
    new SystemHostedClock();

  let account =
    await getOrCreateHostedAccount({
      repository:
        input.repository,
      authSubjectId:
        auth.authSubjectId,
      email:
        auth.email,
      emailVerifiedAt:
        auth.emailVerified
          ? clock.now()
          : null,
      now:
        clock.now(),
    });

  assertAccountEmail(
    account,
    auth.email,
  );

  const verifiedAt =
    auth.emailVerified
      ? account.emailVerifiedAt ??
        clock.now().toISOString()
      : null;

  const verificationChanged =
    account.emailVerifiedAt !==
    verifiedAt;

  if (verificationChanged) {
    account = await input.repository.saveAccount({
      ...account,
      emailVerifiedAt:
        verifiedAt,
      updatedAt:
        clock.now().toISOString(),
    });
  }

  assertAccountActive(account);

  return {
    auth,
    account,
  };
}

function assertAccountEmailInput(
  email: string,
): void {
  if (!email.trim()) {
    throw new Error(
      "HOSTED_AUTH_EMAIL_REQUIRED",
    );
  }
}