"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Props = {
  email: string;
};

export function ResendVerification({ email }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/hosted",
      });

      if (result.error) {
        setError(
          result.error.message ?? "Unable to resend verification email.",
        );
        return;
      }

      setMessage("Verification instructions sent.");
    } catch {
      setError("Unable to resend verification instructions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={resend} disabled={loading}>
        {loading ? "Sending..." : "Resend verification email"}
      </button>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
