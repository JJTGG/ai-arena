import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { HostedAuthContext } from "./auth";

export async function getHostedAuthContext(): Promise<HostedAuthContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  return {
    authSubjectId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  };
}
