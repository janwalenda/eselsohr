import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { neon } from "@neondatabase/serverless";

const workspaceRoot = process.cwd();

loadDotenv({ path: resolve(workspaceRoot, ".env.local") });
loadDotenv({ path: resolve(workspaceRoot, ".env") });

function readRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? "";

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

function getDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL?.trim() ?? "";

  if (directUrl) {
    return directUrl;
  }

  const host = readRequiredEnv("PGHOST");

  const database = readRequiredEnv("PGDATABASE");

  const user = readRequiredEnv("PGUSER");

  const password = readRequiredEnv("PGPASSWORD");

  const sslMode = (process.env.PGSSLMODE ?? "require").trim();

  const channelBinding = (process.env.PGCHANNELBINDING ?? "").trim();

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

function splitSqlStatements(source) {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const sql = neon(getDatabaseUrl());

const migrationsDir = resolve(workspaceRoot, "db", "migrations");

const migrationFiles = (await readdir(migrationsDir))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

for (const migrationFile of migrationFiles) {
  const migrationSql = await readFile(resolve(migrationsDir, migrationFile), "utf8");

  for (const statement of splitSqlStatements(migrationSql)) {
    await sql.query(statement);
  }

  console.log(`Applied migration: ${migrationFile}`);
}
