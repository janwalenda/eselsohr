import type { H3Event } from "h3";
import { readBody } from "h3";
import { forwardTextSession } from "../../../../../../utils/nc-text";
import { indexPageTagsFromMarkdown } from "../../../../../../utils/page-tags-index";

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

  const payload = await readBody<Record<string, unknown>>(event);

  const documentId = Number(payload?.documentId);

  if (!Number.isFinite(documentId)) {
    throw createError({ statusCode: 400, statusMessage: "Missing documentId in request body" });
  }

  const { status, body } = await forwardTextSession(event, "save", documentId, payload);

  if (status >= 200 && status < 300 && typeof payload.autosaveContent === "string") {
    await indexPageTagsFromMarkdown(event, collectiveId, pageId, payload.autosaveContent);
  }

  setResponseStatus(event, status);

  return body;
});
