"use client";

import { useState } from "react";

export function HostedCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/hosted/checkout", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(
          result.error?.message ??
            "Unable to initialize Hosted Arena checkout.",
        );
        return;
      }

      if (result.alreadyActive) {
        window.location.reload();
        return;
      }

      if (!result.checkoutUrl) {
        setError(
          "Checkout could not be initialized. Please try again.",
        );
        return;
      }

      window.location.assign(result.checkoutUrl);
    } catch {
      setError(
        "Unable to initialize Hosted Arena checkout. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
      >
        {loading ? "Initializing checkout..." : "Activate Hosted Arena"}
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}
