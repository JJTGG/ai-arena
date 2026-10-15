
"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import styles from "../hosted.module.css";

export function HostedAuth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        if (result.error) {
          setError(
            result.error.message ?? "Unable to create account.",
          );
          return;
        }

        setMessage(
          "Account created. Check your email for verification.",
        );
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });

        if (result.error) {
          setError(
            result.error.message ?? "Unable to sign in.",
          );
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
        email: email.trim(),
        callbackURL: "/hosted",
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Unable to resend the verification email.",
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

  const isSignIn = mode === "signin";

  return (
    <div className={styles.auth}>
      <div
        className={styles.authModes}
        role="tablist"
        aria-label="Account access"
      >
        <button
          type="button"
          id="hosted-signin-tab"
          role="tab"
          aria-selected={isSignIn}
          aria-controls="hosted-auth-panel"
          className={`${styles.authMode} ${
            isSignIn ? styles.authModeActive : ""
          }`}
          onClick={() => changeMode("signin")}
          disabled={loading}
        >
          Sign in
        </button>

        <button
          type="button"
          id="hosted-signup-tab"
          role="tab"
          aria-selected={!isSignIn}
          aria-controls="hosted-auth-panel"
          className={`${styles.authMode} ${
            !isSignIn ? styles.authModeActive : ""
          }`}
          onClick={() => changeMode("signup")}
          disabled={loading}
        >
          Create account
        </button>
      </div>

      <div
        id="hosted-auth-panel"
        className={styles.authPanel}
        role="tabpanel"
        aria-labelledby={
          isSignIn ? "hosted-signin-tab" : "hosted-signup-tab"
        }
      >
        <div className={styles.authIntro}>
          <p className={styles.authEyebrow}>
            {isSignIn ? "ACCOUNT ACCESS" : "NEW ACCOUNT"}
          </p>

          <h2 className={styles.authTitle}>
            {isSignIn ? "Welcome back." : "Join the arena."}
          </h2>

          <p className={styles.authDescription}>
            {isSignIn
              ? "Sign in to continue to your Hosted Arena access."
              : "Create your account to begin the Hosted Arena access process."}
          </p>
        </div>

        <form
          className={styles.authForm}
          onSubmit={handleSubmit}
        >
          {!isSignIn && (
            <div className={styles.authField}>
              <label
                className={styles.authLabel}
                htmlFor="hosted-auth-name"
              >
                Name
              </label>

              <input
                id="hosted-auth-name"
                className={styles.authInput}
                name="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.currentTarget.value)
                }
                placeholder="Your name"
                autoComplete="name"
                minLength={1}
                maxLength={100}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className={styles.authField}>
            <label
              className={styles.authLabel}
              htmlFor="hosted-auth-email"
            >
              Email address
            </label>

            <input
              id="hosted-auth-email"
              className={styles.authInput}
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.currentTarget.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.authField}>
            <label
              className={styles.authLabel}
              htmlFor="hosted-auth-password"
            >
              Password
            </label>

            <input
              id="hosted-auth-password"
              className={styles.authInput}
              name="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.currentTarget.value)
              }
              placeholder={
                isSignIn
                  ? "Enter your password"
                  : "Create a password"
              }
              autoComplete={
                isSignIn ? "current-password" : "new-password"
              }
              minLength={8}
              required
              disabled={loading}
            />

            {!isSignIn && (
              <p className={styles.authFieldHint}>
                Use at least 8 characters.
              </p>
            )}
          </div>

          {error && (
            <div
              className={`${styles.authFeedback} ${styles.authFeedbackError}`}
              role="alert"
            >
              <strong>Unable to continue</strong>
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div
              className={`${styles.authFeedback} ${styles.authFeedbackSuccess}`}
              role="status"
              aria-live="polite"
            >
              <strong>
                {isSignIn ? "Request complete" : "Check your inbox"}
              </strong>
              <p>{message}</p>
            </div>
          )}

          <button
            className={styles.authSubmit}
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            <span>
              {loading
                ? "Processing..."
                : isSignIn
                  ? "Sign in"
                  : "Create account"}
            </span>

            {!loading && (
              <span aria-hidden="true">
                {isSignIn ? "→" : "+"}
              </span>
            )}
          </button>
        </form>

        {isSignIn && (
          <div className={styles.authSecondary}>
            <span className={styles.authSecondaryText}>
              Didn't receive your verification email?
            </span>

            <button
              className={styles.authTextAction}
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Resend verification email"}
            </button>
          </div>
        )}

        <p className={styles.authFootnote}>
          Hosted Arena access requires email verification, age
          confirmation, and an active entitlement.
        </p>
      </div>
    </div>
  );
}
