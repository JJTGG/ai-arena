import { betterAuth } from "better-auth";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

export const auth = betterAuth({
  database: {
    dialect: new PostgresDialect({
      pool,
    }),
    type: "postgres",
    schemaName: "auth",
  },

  secret,

  emailAndPassword: {
    enabled: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    async sendVerificationEmail({ user, url }) {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.AUTH_EMAIL_FROM;

      // $0 local development:
      // print the verification URL to the dev server terminal.
      if (!apiKey || !from) {
        if (process.env.NODE_ENV !== "production") {
          console.log("\n[HOSTED ARENA] EMAIL VERIFICATION URL");
          console.log(url);
          console.log();
          return;
        }

        throw new Error("AUTH_EMAIL_CONFIG_MISSING");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: user.email,
          subject: "Verify your AI Arena account",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Verify your AI Arena account</h2>
              <p>Click the button below to verify your email address.</p>
              <p>
                <a
                  href="${url}"
                  style="
                    display:inline-block;
                    padding:12px 18px;
                    background:#111;
                    color:#fff;
                    text-decoration:none;
                    border-radius:6px;
                  "
                >
                  Verify email
                </a>
              </p>
              <p>If you did not create this account, you can ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(
          "[HOSTED ARENA] Verification email failed:",
          response.status,
          body,
        );
        throw new Error("VERIFICATION_EMAIL_SEND_FAILED");
      }
    },
  },
});
