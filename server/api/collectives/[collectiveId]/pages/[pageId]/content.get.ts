import type { H3Event } from "h3";
import {
  buildAttachmentProxyBase,
  rewriteCollectiveAttachmentsForDisplay,
} from "../../../../../../shared/collective-attachments";
import { getPage } from "../../../../../utils/nc-collectives";
import { readPageContent } from "../../../../../utils/nc-webdav";

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

  const page = await getPage(event, collectiveId, pageId);

  const content = await readPageContent(event, page);

  const proxyBase = buildAttachmentProxyBase(collectiveId, pageId);

  return {
    page,
    content: rewriteCollectiveAttachmentsForDisplay(content.content, proxyBase),
    etag: content.etag,
  };
});
