import type { H3Event } from "h3";
import {
  buildAttachmentProxyBase,
  rewriteCollectiveAttachmentsForStorage,
} from "../../../../../../shared/collective-attachments";
import { composeMarkdownFile, parseMarkdownFile } from "../../../../../../shared/frontmatter";
import type { PageProperties } from "../../../../../../shared/properties";
import { getPage } from "../../../../../utils/nc-collectives";
import { indexPageIconForPage } from "../../../../../utils/page-icons-index";
import { indexPageTagsFromMarkdown } from "../../../../../utils/page-tags-index";
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

  const body = await readBody<{
    content?: string;
    properties?: PageProperties;
    etag?: string | null;
  }>(event);

  if (typeof body.content !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Markdown content is required" });
  }

  const page = await getPage(event, collectiveId, pageId);

  const proxyBase = buildAttachmentProxyBase(collectiveId, pageId);

  const parsed = parseMarkdownFile(body.content);

  const properties = body.properties ?? parsed.properties;

  const markdownBody = rewriteCollectiveAttachmentsForStorage(
    body.properties ? body.content : parsed.body,
    proxyBase,
  );

  const markdown = composeMarkdownFile(properties, markdownBody);

  const result = await writePageContent(event, page, markdown, body.etag ?? null);

  await indexPageTagsFromMarkdown(event, collectiveId, pageId, markdown);
  await indexPageIconForPage(event, collectiveId, page, markdown);

  return {
    page,
    etag: result.etag,
  };
});
