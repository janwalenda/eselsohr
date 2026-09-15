import type { H3Event } from "h3";
import { ncFetchJson } from "./nc-api";

type OcsResponse<T> = {
  ocs?: {
    data?: T;
  };
};

export async function renameCircle(event: H3Event, circleId: string, name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw createError({ statusCode: 400, statusMessage: "A name is required" });
  }

  if (!circleId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Collective has no team id for renaming",
    });
  }

  try {
    await ncFetchJson<OcsResponse<unknown>>(
      event,
      `/ocs/v2.php/apps/circles/circles/${encodeURIComponent(circleId)}/name`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: trimmed }),
      },
    );
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;

    if (statusCode === 404) {
      throw createError({
        statusCode: 502,
        statusMessage:
          "Umbenennen ist auf dieser Nextcloud-Instanz nicht verfügbar (Teams/Circles-API).",
        data: error,
      });
    }

    throw error;
  }
}
