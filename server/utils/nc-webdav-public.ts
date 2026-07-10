import type { CollectivePage } from "../../shared/collectives";
import { createNcConnectivityError, normalizeNcUrl } from "./nc-api";
import { getPageDavRelativePath, resolveAttachmentRelativePath } from "./nc-webdav";

type PageDavTarget = Pick<CollectivePage, "collectivePath" | "filePath" | "fileName">;

function encodePathPart(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildPublicDavUrl(ncUrl: string, token: string, relativePath: string) {
  const path = [
    "public.php",
    "dav",
    "files",
    encodeURIComponent(token),
    encodePathPart(relativePath),
  ]
    .filter(Boolean)
    .join("/");

  return new URL(path, `${normalizeNcUrl(ncUrl)}/`).toString();
}

async function getPublicDavResponse(
  ncUrl: string,
  token: string,
  relativePath: string,
  init: RequestInit = {},
) {
  const targetUrl = buildPublicDavUrl(ncUrl, token, relativePath);

  let response: Response;

  try {
    response = await fetch(targetUrl, init);
  } catch (error) {
    throw createNcConnectivityError(targetUrl, error);
  }

  return response;
}

export async function readPublicPageContent(ncUrl: string, token: string, page: PageDavTarget) {
  const relativePath = getPageDavRelativePath(page);
  const response = await getPublicDavResponse(ncUrl, token, relativePath, {
    method: "GET",
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage:
        response.status === 404
          ? "Shared page content not found"
          : "Failed to fetch shared page content from WebDAV",
      data: await response.text(),
    });
  }

  return {
    content: await response.text(),
    etag: response.headers.get("etag"),
  };
}

export async function readPublicAttachmentFile(
  ncUrl: string,
  token: string,
  page: PageDavTarget,
  attachmentRelativePath: string,
) {
  const response = await getPublicDavResponse(
    ncUrl,
    token,
    resolveAttachmentRelativePath(page, attachmentRelativePath),
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw createError({
      statusCode: response.status === 404 ? 404 : response.status,
      statusMessage: "Shared attachment not found",
    });
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
    etag: response.headers.get("etag"),
  };
}
