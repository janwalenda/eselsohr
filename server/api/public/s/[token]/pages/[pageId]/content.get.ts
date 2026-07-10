import type { H3Event } from "h3";
import {
  buildPublicAttachmentProxyBase,
  rewriteCollectiveAttachmentsForDisplay,
} from "../../../../../../../shared/collective-attachments";
import { getPublicPage } from "../../../../../../utils/nc-collectives-public";
import {
  getPublicShareMapping,
  withPublicShareCleanup,
} from "../../../../../../utils/public-shares";
import { readPublicPageContent } from "../../../../../../utils/nc-webdav-public";

function getPageId(event: H3Event) {
  const pageId = Number(getRouterParam(event, "pageId"));

  if (!Number.isFinite(pageId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid pageId" });
  }

  return pageId;
}

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token")?.trim();

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Invalid share token" });
  }

  const pageId = getPageId(event);
  const share = await getPublicShareMapping(event, token);
  const page = await withPublicShareCleanup(event, token, async () =>
    getPublicPage(share.ncUrl, token, pageId),
  );
  const content = await withPublicShareCleanup(event, token, async () =>
    readPublicPageContent(share.ncUrl, token, page),
  );

  return {
    share,
    page,
    content: rewriteCollectiveAttachmentsForDisplay(
      content.content,
      buildPublicAttachmentProxyBase(token, pageId),
    ),
    etag: content.etag,
  };
});
