import type { H3Event } from "h3";
import { deletePublicShareByToken, getPublicShareByToken } from "./public-shares-db";

export async function getPublicShareMapping(event: H3Event, token: string) {
  const share = await getPublicShareByToken(event, token);

  if (!share) {
    throw createError({ statusCode: 404, statusMessage: "Public share not found" });
  }

  return share;
}

export async function withPublicShareCleanup<T>(
  event: H3Event,
  token: string,
  task: () => Promise<T>,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;

    if (statusCode === 404) {
      await deletePublicShareByToken(event, token);
    }

    throw error;
  }
}
