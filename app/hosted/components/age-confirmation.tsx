"use client";

import { useState } from "react";

export function AgeConfirmation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirmAge() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/hosted/age-confirm", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(
          result.error === "EMAIL_VERIFICATION_REQUIRED"
            ? "Verify your email before confirming your age."
            : "Unable to confirm your age. Please try again.",
        );
        return;
      }

      window.location.reload();
    } catch {
      setError("Unable to confirm your age. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={confirmAge} disabled={loading}>
        {loading ? "Confirming..." : "I confirm that I am 18 or older"}
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}
