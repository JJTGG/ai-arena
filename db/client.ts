import "server-only";

import {
  Client,
} from "@neondatabase/serverless";
import WebSocket from "ws";

function requireDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required.",
    );
  }

  return databaseUrl;
}

export async function createHostedDbClient(): Promise<Client> {
  const client = new Client({
    connectionString:
      requireDatabaseUrl(),
  });

  client.neonConfig.webSocketConstructor =
    WebSocket;

  await client.connect();

  return client;
}

export async function withHostedDbTransaction<T>(
  callback: (
    client: Client,
  ) => Promise<T>,
): Promise<T> {
  const client =
    await createHostedDbClient();

  try {
    await client.query("BEGIN");

    const result =
      await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original transaction error.
    }

    throw error;
  } finally {
    await client.end();
  }
}