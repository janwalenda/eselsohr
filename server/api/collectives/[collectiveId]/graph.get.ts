import type { H3Event } from "h3";
import type { GraphMode } from "../../../../shared/graph";
import { buildCollectiveGraph } from "../../../utils/collective-graph";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

function getGraphMode(event: H3Event): GraphMode {
  const mode = getQuery(event).mode;

  if (mode === "folder" || mode === "links") {
    return mode;
  }

  return "links";
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const mode = getGraphMode(event);

  return buildCollectiveGraph(event, collectiveId, mode);
});
