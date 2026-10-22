import type { H3Event } from "h3";
import type { CollectivePage } from "../../shared/collectives";
import { createNcConnectivityError } from "./nc-api";
import { getActiveSession } from "./nc-session";

function encodePathPart(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

type PageDavTarget = Pick<CollectivePage, "collectivePath" | "filePath" | "fileName">;

/** Relative path under the user's files root (collective dir + optional subdirs + file). */
export function getPageDavRelativePath(page: PageDavTarget) {
  return [page.collectivePath, page.filePath, page.fileName]
    .filter((part) => part?.trim())
    .join("/");
}

function buildDavUrlFromRelativePath(ncUrl: string, loginName: string, relativePath: string) {
  const path = [
    "remote.php",
    "dav",
    "files",
    encodeURIComponent(loginName),
    encodePathPart(relativePath),
  ]
    .filter(Boolean)
    .join("/");

  return new URL(path, `${ncUrl}/`).toString();
}

function buildDavUrl(ncUrl: string, loginName: string, page: PageDavTarget) {
  return buildDavUrlFromRelativePath(ncUrl, loginName, getPageDavRelativePath(page));
}

export function getPageDirectoryRelativePath(page: PageDavTarget) {
  const parts = getPageDavRelativePath(page).split("/").filter(Boolean);

  if (parts.length <= 1) {
    return "";
  }

  parts.pop();
  return parts.join("/");
}

export function resolveAttachmentRelativePath(page: PageDavTarget, attachmentPath: string) {
  const normalized = attachmentPath.replace(/^\.\//, "");

  const directory = getPageDirectoryRelativePath(page);

  return directory ? `${directory}/${normalized}` : normalized;
}

async function getDavResponseForUrl(event: H3Event, davUrl: string, init: RequestInit = {}) {
  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "No active Nextcloud session" });
  }

  const token = Buffer.from(`${session.loginName}:${session.appPassword}`).toString("base64");

  const headers = new Headers(init.headers);

  headers.set("Authorization", `Basic ${token}`);

  let response: Response;

  try {
    response = await fetch(davUrl, {
      ...init,
      headers,
    });
  } catch (error) {
    throw createNcConnectivityError(davUrl, error);
  }

  return response;
}

async function getDavResponse(event: H3Event, page: PageDavTarget, init: RequestInit = {}) {
  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "No active Nextcloud session" });
  }

  const davUrl = buildDavUrl(session.ncUrl, session.loginName, page);

  return getDavResponseForUrl(event, davUrl, init);
}

async function getDavResponseAtRelativePath(
  event: H3Event,
  relativePath: string,
  init: RequestInit = {},
) {
  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "No active Nextcloud session" });
  }

  const davUrl = buildDavUrlFromRelativePath(session.ncUrl, session.loginName, relativePath);

  return getDavResponseForUrl(event, davUrl, init);
}

async function getPageEtag(event: H3Event, page: PageDavTarget) {
  const response = await getDavResponse(event, page, {
    method: "HEAD",
  });

  if (!response.ok) {
    return null;
  }

  return response.headers.get("etag");
}

export async function readPageContent(event: H3Event, page: PageDavTarget) {
  const response = await getDavResponse(event, page, {
    method: "GET",
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: "Failed to fetch page content from WebDAV",
      data: await response.text(),
    });
  }

  const content = await response.text();

  return {
    content,
    etag: response.headers.get("etag"),
  };
}

export async function writePageContent(
  event: H3Event,
  page: PageDavTarget,
  content: string,
  etag?: string | null,
) {
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
  });

  if (etag) {
    headers.set("If-Match", etag);
  }

  const response = await getDavResponse(event, page, {
    method: "PUT",
    headers,
    body: content,
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage:
        response.status === 412
          ? "The page changed on Nextcloud before this save completed"
          : "Failed to save page content to WebDAV",
      data: await response.text(),
    });
  }

  return {
    etag: response.headers.get("etag") ?? (await getPageEtag(event, page)),
  };
}

function parseFileIdFromPropfind(xml: string) {
  const match = xml.match(/<(?:oc|nc):fileid>(\d+)<\/(?:oc|nc):fileid>/i);

  return match?.[1] ?? null;
}

export async function getPageFileId(event: H3Event, page: PageDavTarget) {
  const response = await getDavResponse(event, page, {
    method: "PROPFIND",
    headers: {
      Depth: "0",
      "Content-Type": "application/xml",
    },
    body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop><oc:fileid/><nc:fileid/></d:prop>
</d:propfind>`,
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: "Failed to read page file metadata from WebDAV",
    });
  }

  const xml = await response.text();

  const fileId = parseFileIdFromPropfind(xml);

  if (!fileId) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return a file id for this page",
    });
  }

  return fileId;
}

export async function readAttachmentFile(
  event: H3Event,
  page: PageDavTarget,
  attachmentRelativePath: string,
) {
  const davRelativePath = resolveAttachmentRelativePath(page, attachmentRelativePath);

  const response = await getDavResponseAtRelativePath(event, davRelativePath, {
    method: "GET",
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status === 404 ? 404 : response.status,
      statusMessage: "Attachment not found",
    });
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    buffer,
    contentType: response.headers.get("content-type"),
    etag: response.headers.get("etag"),
  };
}

async function ensureDavCollection(event: H3Event, relativePath: string) {
  const response = await getDavResponseAtRelativePath(event, relativePath, {
    method: "MKCOL",
  });

  if (response.ok || response.status === 405) {
    return;
  }

  throw createError({
    statusCode: response.status,
    statusMessage: "Failed to create attachment folder on Nextcloud",
    data: await response.text(),
  });
}

export async function uploadAttachmentFile(
  event: H3Event,
  page: PageDavTarget,
  fileName: string,
  data: Buffer,
  contentType: string,
) {
  const fileId = await getPageFileId(event, page);

  const attachmentFolder = `.attachments.${fileId}`;

  const directoryPath = resolveAttachmentRelativePath(page, attachmentFolder);

  await ensureDavCollection(event, directoryPath);

  const safeName = fileName.replace(/[/\\]/g, "_").trim() || "upload";

  const attachmentRelativePath = `${attachmentFolder}/${safeName}`;

  const davRelativePath = resolveAttachmentRelativePath(page, attachmentRelativePath);

  const response = await getDavResponseAtRelativePath(event, davRelativePath, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
    body: data,
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: "Failed to upload attachment to Nextcloud",
      data: await response.text(),
    });
  }

  return {
    path: attachmentRelativePath,
    fileId,
  };
}
