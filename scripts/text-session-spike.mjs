/**
 * Phase 0 spike: validate the Nextcloud Text session API against a real instance.
 *
 * Goal: prove that Eselsohr can join the same collaborative editing session that
 * the Collectives/Text web UI uses, by talking to /apps/text/session/* directly.
 *
 * Run standalone (only depends on `yjs`, already a runtime dependency):
 *
 *   NC_URL=https://cloud.example.com \
 *   NC_USER=alice \
 *   NC_APP_PASSWORD=xxxx-xxxx-xxxx \
 *   NC_FILE_PATH="Notes/Readme.md" \
 *   node scripts/text-session-spike.mjs
 *
 * NC_FILE_PATH is the path relative to the user's files root (the same path the
 * WebDAV endpoint /remote.php/dav/files/<user>/ uses). For a Collective page this
 * is e.g. "<collective>/<subpages>/<page>.md".
 *
 * Optional: open the same file in the Nextcloud web UI while this runs and type;
 * the script polls `sync` and prints the number of incoming steps.
 */

import process from "node:process";
import { Buffer } from "node:buffer";
import * as Y from "yjs";

const NC_URL = required("NC_URL").replace(/\/+$/, "");

const NC_USER = required("NC_USER");

const NC_APP_PASSWORD = required("NC_APP_PASSWORD");

const NC_FILE_PATH = required("NC_FILE_PATH").replace(/^\/+/, "");

function required(name) {
  const value = process.env[name];

  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }

  return value;
}

function authHeader() {
  return `Basic ${Buffer.from(`${NC_USER}:${NC_APP_PASSWORD}`).toString("base64")}`;
}

function davUrl() {
  const encoded = NC_FILE_PATH.split("/").map(encodeURIComponent).join("/");

  return `${NC_URL}/remote.php/dav/files/${encodeURIComponent(NC_USER)}/${encoded}`;
}

async function getFileMeta() {
  const body = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop><oc:fileid/><nc:fileid/><d:getetag/></d:prop>
</d:propfind>`;

  const response = await fetch(davUrl(), {
    method: "PROPFIND",
    headers: {
      Authorization: authHeader(),
      Depth: "0",
      "Content-Type": "application/xml",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`PROPFIND failed: ${response.status} ${await response.text()}`);
  }

  const xml = await response.text();

  const fileId = xml.match(/<(?:oc|nc):fileid>(\d+)<\/(?:oc|nc):fileid>/i)?.[1];

  const etag = xml.match(/<d:getetag>"?([^"<]+)"?<\/d:getetag>/i)?.[1];

  if (!fileId) {
    throw new Error("Could not parse fileid from PROPFIND response");
  }

  return { fileId: Number(fileId), etag: etag ? `"${etag}"` : undefined };
}

async function textApi(path, payload) {
  const response = await fetch(`${NC_URL}/index.php/apps/text${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "OCS-APIRequest": "true",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let json;

  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: response.status, json };
}

async function createSession({ fileId, baseVersionEtag }) {
  const response = await fetch(`${NC_URL}/index.php/apps/text/session/${fileId}/create`, {
    method: "PUT",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "OCS-APIRequest": "true",
      Accept: "application/json",
    },
    body: JSON.stringify({
      fileId,
      filePath: NC_FILE_PATH,
      ...(baseVersionEtag ? { baseVersionEtag } : {}),
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`create failed: ${response.status} ${text}`);
  }

  return JSON.parse(text);
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  logSection("1. WebDAV metadata (fileId + etag)");
  const meta = await getFileMeta();

  console.log(meta);

  logSection("2. Create Text session");
  // Omit baseVersionEtag on create unless you have Text's session etag from a prior
  // open (not the WebDAV ETag). Passing the file ETag causes HTTP 412.
  const open = await createSession({ fileId: meta.fileId });

  const document = open.document;

  const session = open.session;

  console.log({
    documentId: document?.id,
    sessionId: session?.id,
    hasToken: Boolean(session?.token),
    readOnly: open.readOnly,
    baseVersionEtag: document?.baseVersionEtag,
    lastSavedVersion: document?.lastSavedVersion,
    hasInitialContent: typeof open.content === "string",
    hasDocumentState: typeof open.documentState === "string",
  });

  const connection = {
    documentId: document.id,
    sessionId: session.id,
    sessionToken: session.token,
    baseVersionEtag: document.baseVersionEtag,
    filePath: NC_FILE_PATH,
  };

  // Build a Yjs doc that mirrors the server state so we can produce a valid update.
  const ydoc = new Y.Doc();

  if (open.documentState) {
    Y.applyUpdate(ydoc, Buffer.from(open.documentState, "base64"));
  }

  logSection("3. Initial sync");
  let version = 0;

  const sync = await textApi(`/session/${connection.documentId}/sync`, {
    ...connection,
    version,
  });

  console.log({
    status: sync.status,
    steps: sync.json?.steps?.length,
    sessions: sync.json?.sessions?.length,
  });

  logSection("4. Live poll (Ctrl+C to stop) - edit the same file in the NC web UI");
  setInterval(async () => {
    const poll = await textApi(`/session/${connection.documentId}/sync`, {
      ...connection,
      version,
    });

    const steps = poll.json?.steps ?? [];

    if (steps.length > 0) {
      version = Math.max(version, ...steps.map((s) => s.version ?? version));
      console.log(
        `[${new Date().toISOString()}] received ${steps.length} step(s), version -> ${version}`,
      );
    }

    const sessions = poll.json?.sessions ?? [];

    if (sessions.length > 1) {
      console.log(
        `  collaborators: ${sessions.map((s) => s.displayName || s.guestName || s.userId).join(", ")}`,
      );
    }
  }, 1000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
