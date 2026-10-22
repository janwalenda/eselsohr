/** Nextcloud Text / Collectives attachment folder (relative to the .md file directory). */
const ATTACHMENT_RELATIVE_RE = /^\.attachments\.\d+\//;

export function isValidAttachmentRelativePath(path: string) {
  const normalized = path.replace(/^\.\//, "").trim();

  if (!normalized || normalized.includes("..")) {
    return false;
  }

  return ATTACHMENT_RELATIVE_RE.test(normalized);
}

export function encodeAttachmentPath(path: string) {
  return path
    .replace(/^\.\//, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function decodeAttachmentPath(encoded: string) {
  return encoded
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function buildAttachmentProxyBase(collectiveId: number, pageId: number) {
  return `/api/collectives/${collectiveId}/pages/${pageId}/attachments`;
}

export function buildPublicAttachmentProxyBase(token: string, pageId: number) {
  return `/api/public/s/${encodeURIComponent(token)}/pages/${pageId}/attachments`;
}

const ATTACHMENT_PATH_IN_MARKDOWN_RE = /(\.?attachments\.\d+\/[^\s)\]"'<>]+)/g;

export function rewriteCollectiveAttachmentsForDisplay(markdown: string, proxyBase: string) {
  const base = proxyBase.replace(/\/$/, "");

  return markdown.replace(ATTACHMENT_PATH_IN_MARKDOWN_RE, (match) => {
    const normalized = match.replace(/^\.\//, "");

    if (!isValidAttachmentRelativePath(normalized)) {
      return match;
    }

    return `${base}/${encodeAttachmentPath(normalized)}`;
  });
}

export function rewriteCollectiveAttachmentsForStorage(markdown: string, proxyBase: string) {
  const escapedBase = proxyBase.replace(/\/$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const re = new RegExp(`${escapedBase}/((?:\\.attachments\\.\\d+/[^)\\s"']+))`, "g");

  return markdown.replace(re, (_full, encodedPath: string) => decodeAttachmentPath(encodedPath));
}
