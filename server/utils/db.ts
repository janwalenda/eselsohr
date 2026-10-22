import { neon } from "@neondatabase/serverless";
import type { H3Event } from "h3";

type SqlClient = ReturnType<typeof neon>;
type DatabaseConfigInput = {
  databaseUrl?: string;
  pgHost?: string;
  pgDatabase?: string;
  pgUser?: string;
  pgPassword?: string;
  pgSslMode?: string;
  pgChannelBinding?: string;
};

let cachedClient: SqlClient | null = null;

let cachedUrl: string | null = null;

function readRequiredValue(value: string | undefined, label: string) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing database configuration: ${label}`,
    });
  }

  return normalized;
}

export function buildDatabaseUrl(input: DatabaseConfigInput = {}) {
  const configuredUrl = input.databaseUrl?.trim() || process.env.DATABASE_URL?.trim() || "";

  if (configuredUrl) {
    return configuredUrl;
  }

  const host = readRequiredValue(input.pgHost || process.env.PGHOST, "PGHOST");

  const database = readRequiredValue(input.pgDatabase || process.env.PGDATABASE, "PGDATABASE");

  const user = readRequiredValue(input.pgUser || process.env.PGUSER, "PGUSER");

  const password = readRequiredValue(input.pgPassword || process.env.PGPASSWORD, "PGPASSWORD");

  const sslMode = (input.pgSslMode || process.env.PGSSLMODE || "require").trim();

  const channelBinding = (input.pgChannelBinding || process.env.PGCHANNELBINDING || "").trim();

  const url = new URL(
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}`,
  );

  url.pathname = `/${database}`;

  if (sslMode) {
    url.searchParams.set("sslmode", sslMode);
  }

  if (channelBinding) {
    url.searchParams.set("channel_binding", channelBinding);
  }

  return url.toString();
}

export function getDb(event?: H3Event) {
  const config = useRuntimeConfig(event);

  const url = buildDatabaseUrl(config);

  if (!cachedClient || cachedUrl !== url) {
    cachedClient = neon(url);
    cachedUrl = url;
  }

  return cachedClient;
}
