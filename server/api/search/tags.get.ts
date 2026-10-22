import { listKnownTags } from "../../utils/page-tags-db";

function isMissingPageTagsTable(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes('relation "page_tags" does not exist') ||
      (error as { code?: string }).code === "42P01")
  );
}

export default defineEventHandler(async (event) => {
  try {
    const tags = await listKnownTags(event);

    return { tags };
  } catch (error) {
    if (isMissingPageTagsTable(error)) {
      return { tags: [] };
    }

    throw error;
  }
});
