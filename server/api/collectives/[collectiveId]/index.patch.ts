import type { H3Event } from "h3";
import type { CollectiveSummary, UpdateCollectiveInput } from "~~/shared/collectives";
import { slugifyCollectiveName, validateCollectiveEmoji } from "~~/shared/collectives";
import { renameCircle } from "../../../utils/nc-circles";
import {
  setCollectiveEditLevel,
  setCollectivePageMode,
  setCollectiveShareLevel,
  updateCollectiveEmoji,
} from "../../../utils/nc-collectives";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const body = await readBody<
    UpdateCollectiveInput & {
      circleId?: string;
    }
  >(event);

  let collective: CollectiveSummary | null = null;

  const renameErrors: string[] = [];

  if (typeof body.name === "string" && body.name.trim()) {
    const circleId = body.circleId?.trim();

    if (!circleId) {
      throw createError({
        statusCode: 400,
        statusMessage: "circleId is required to rename a collective",
      });
    }

    try {
      await renameCircle(event, circleId, body.name);
    } catch (error) {
      const message =
        typeof error === "object" && error && "statusMessage" in error
          ? String((error as { statusMessage?: string }).statusMessage)
          : "Collective konnte nicht umbenannt werden.";

      renameErrors.push(message);
    }
  }

  if (body.emoji !== undefined) {
    const emojiValidation = validateCollectiveEmoji(body.emoji);

    if (!emojiValidation.valid) {
      throw createError({ statusCode: 422, statusMessage: emojiValidation.message });
    }

    collective = await updateCollectiveEmoji(event, collectiveId, body.emoji ?? null);
  }

  if (typeof body.editLevel === "number") {
    collective = await setCollectiveEditLevel(event, collectiveId, body.editLevel);
  }

  if (typeof body.shareLevel === "number") {
    collective = await setCollectiveShareLevel(event, collectiveId, body.shareLevel);
  }

  if (typeof body.pageMode === "number") {
    collective = await setCollectivePageMode(event, collectiveId, body.pageMode);
  }

  if (!collective && renameErrors.length === 0 && body.name?.trim()) {
    collective = {
      id: collectiveId,
      name: body.name.trim(),
      slug: slugifyCollectiveName(body.name),
      circleId: body.circleId,
    };
  }

  if (!collective && renameErrors.length > 0) {
    throw createError({
      statusCode: 502,
      statusMessage: renameErrors[0],
    });
  }

  if (!collective) {
    throw createError({
      statusCode: 400,
      statusMessage: "No collective updates provided",
    });
  }

  if (renameErrors.length > 0) {
    return {
      collective,
      warnings: renameErrors,
    };
  }

  return { collective };
});
