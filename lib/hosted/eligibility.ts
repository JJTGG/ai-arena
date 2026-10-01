import { HostedError } from "./errors";
import {
  assertAccountActive,
  requireAuthenticatedUser,
  requireVerifiedEmail,
  type HostedAuthContext,
} from "./auth";
import type { HostedAccount } from "./types";

export type HostedEligibilityInput = {
  ageConfirmed: boolean;
};

export function validateAgeConfirmation(
  ageConfirmed: boolean,
): void {
  if (ageConfirmed !== true) {
    throw new HostedError(
      "HOSTED_ELIGIBILITY_REQUIRED",
      {
        status: 403,
        message: "18+ age confirmation is required.",
      },
    );
  }
}

export function assertHostedEligibility(
  account: HostedAccount,
  authContext: HostedAuthContext,
): void {
  requireAuthenticatedUser(authContext);
  requireVerifiedEmail(authContext);
  assertAccountActive(account);

  if (!account.ageConfirmedAt) {
    throw new HostedError(
      "HOSTED_ELIGIBILITY_REQUIRED",
      {
        status: 403,
        message: "18+ age confirmation is required.",
      },
    );
  }
}

export function validateEligibilityRequest(
  input: HostedEligibilityInput,
): void {
  validateAgeConfirmation(input.ageConfirmed);
}