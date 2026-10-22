import type { H3Event } from "h3";
import { getActiveSession } from "./nc-session";
import { getDb } from "./db";
import { upsertNcInstance } from "./public-shares-db";

type PageTagTarget = {
  collectiveId: number;
  pageId: number;
};

type PageTagSearchResult = PageTagTarget & {
  title: string;
  tags: string[];
};

async function getInstanceId(event: H3Event) {
  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  return upsertNcInstance(event, session.ncUrl);
}

export async function replacePageTags(event: H3Event, target: PageTagTarget, tags: string[]) {
  const instanceId = await getInstanceId(event);

  const sql = getDb(event);

  const normalizedTags = [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

  await sql`
    DELETE FROM page_tags
    WHERE instance_id = ${instanceId}
      AND collective_id = ${target.collectiveId}
      AND page_id = ${target.pageId}
  `;

  for (const tag of normalizedTags) {
    await sql`
      INSERT INTO page_tags (instance_id, collective_id, page_id, tag)
      VALUES (${instanceId}, ${target.collectiveId}, ${target.pageId}, ${tag})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function listKnownTags(event: H3Event, prefix = "") {
  const instanceId = await getInstanceId(event);

  const sql = getDb(event);

  const normalizedPrefix = prefix.trim().toLowerCase();

  const rows = normalizedPrefix
    ? await sql<{ tag: string }[]>`
        SELECT DISTINCT tag
        FROM page_tags
        WHERE instance_id = ${instanceId}
          AND tag LIKE ${`${normalizedPrefix}%`}
        ORDER BY tag ASC
        LIMIT 50
      `
    : await sql<{ tag: string }[]>`
        SELECT DISTINCT tag
        FROM page_tags
        WHERE instance_id = ${instanceId}
        ORDER BY tag ASC
        LIMIT 200
      `;

  return rows.map((row) => row.tag);
}

export async function searchPagesByTag(
  event: H3Event,
  tag: string,
  _titleQuery = "",
): Promise<PageTagSearchResult[]> {
  const instanceId = await getInstanceId(event);

  const sql = getDb(event);

  const normalizedTag = tag.trim().toLowerCase();

  if (!normalizedTag) {
    return [];
  }

  const rows = await sql<
    {
      collective_id: number;
      page_id: number;
      tags: string[] | null;
    }[]
  >`
    SELECT collective_id, page_id, array_agg(tag ORDER BY tag) AS tags
    FROM page_tags
    WHERE instance_id = ${instanceId}
      AND tag = ${normalizedTag}
    GROUP BY collective_id, page_id
    ORDER BY collective_id ASC, page_id ASC
  `;

  return rows.map((row) => ({
    collectiveId: Number(row.collective_id),
    pageId: Number(row.page_id),
    title: "",
    tags: row.tags ?? [],
  }));
}
