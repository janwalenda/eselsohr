import type { H3Event } from "h3";
import {
  buildAttachmentProxyBase,
  rewriteCollectiveAttachmentsForStorage,
} from "../../../../../../shared/collective-attachments";
import { getPage } from "../../../../../utils/nc-collectives";
import { writePageContent } from "../../../../../utils/nc-webdav";

function getNumericRouteParam(event: H3Event, key: string) {
  const value = Number(getRouterParam(event, key));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getNumericRouteParam(event, "collectiveId");

  const pageId = getNumericRouteParam(event, "pageId");

  const body = await readBody<{ content?: string; etag?: string | null }>(event);

  if (typeof body.content !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Markdown content is required" });
  }

  const page = await getPage(event, collectiveId, pageId);

  const proxyBase = buildAttachmentProxyBase(collectiveId, pageId);

  const markdown = rewriteCollectiveAttachmentsForStorage(body.content, proxyBase);

  const result = await writePageContent(event, page, markdown, body.etag ?? null);

  return {
    page,
    etag: result.etag,
  };
});
