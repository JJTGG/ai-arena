"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function HostedAuth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message ?? "Unable to create account.");
          return;
        }

        setMessage("Account created. Check your email for verification.");
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message ?? "Unable to sign in.");
          return;
        }

        window.location.reload();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setError("Enter your account email first.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/hosted",
      });

      if (result.error) {
        setError(
          result.error.message ?? "Unable to resend the verification email.",
        );
        return;
      }

      setMessage("Verification instructions have been sent.");
    } catch {
      setError("Unable to resend verification instructions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError("");
            setMessage("");
          }}
          disabled={loading}
        >
          Sign in
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
            setMessage("");
          }}
          disabled={loading}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
        </label>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Processing..."
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {mode === "signin" && (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={loading}
        >
          Resend verification email
        </button>
      )}
    </section>
  );
}
