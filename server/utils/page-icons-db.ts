import type { H3Event } from "h3";
import { getActiveSession } from "./nc-session";
import { getDb } from "./db";
import { upsertNcInstance } from "./public-shares-db";

export type PageIconRecord = {
  pageId: number;
  ownerPageId: number;
  icon: string;
};

type PageIconTarget = {
  collectiveId: number;
  pageId: number;
};

async function getInstanceId(event: H3Event, instanceIdOverride?: number) {
  if (instanceIdOverride !== undefined) {
    return instanceIdOverride;
  }

  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  return upsertNcInstance(event, session.ncUrl);
}

export async function upsertPageIcon(
  event: H3Event,
  target: PageIconTarget,
  icon: string,
  ownerPageId: number,
  instanceIdOverride?: number,
) {
  const instanceId = await getInstanceId(event, instanceIdOverride);

  const sql = getDb(event);

  await sql`
    INSERT INTO page_icons (instance_id, collective_id, page_id, owner_page_id, icon)
    VALUES (${instanceId}, ${target.collectiveId}, ${target.pageId}, ${ownerPageId}, ${icon})
    ON CONFLICT (instance_id, collective_id, page_id)
    DO UPDATE SET
      owner_page_id = EXCLUDED.owner_page_id,
      icon = EXCLUDED.icon
  `;
}

export async function deletePageIcon(
  event: H3Event,
  target: PageIconTarget,
  instanceIdOverride?: number,
) {
  const instanceId = await getInstanceId(event, instanceIdOverride);

  const sql = getDb(event);

  await sql`
    DELETE FROM page_icons
    WHERE instance_id = ${instanceId}
      AND collective_id = ${target.collectiveId}
      AND page_id = ${target.pageId}
  `;
}

/** Icons for all pages in a collective (excludes collective-level page_id=0). */
export async function getCollectiveIconsMap(
  event: H3Event,
  collectiveId: number,
  instanceIdOverride?: number,
): Promise<Map<number, PageIconRecord>> {
  const instanceId = await getInstanceId(event, instanceIdOverride);

  const sql = getDb(event);

  const rows = await sql<
    {
      page_id: number;
      owner_page_id: number;
      icon: string;
    }[]
  >`
    SELECT page_id, owner_page_id, icon
    FROM page_icons
    WHERE instance_id = ${instanceId}
      AND collective_id = ${collectiveId}
      AND page_id <> 0
  `;

  const map = new Map<number, PageIconRecord>();

  for (const row of rows) {
    map.set(Number(row.page_id), {
      pageId: Number(row.page_id),
      ownerPageId: Number(row.owner_page_id),
      icon: row.icon,
    });
  }

  return map;
}

/** Collective-level icons (page_id = 0) for the whole instance. */
export async function getCollectiveLevelIcons(
  event: H3Event,
  instanceIdOverride?: number,
): Promise<Map<number, PageIconRecord>> {
  const instanceId = await getInstanceId(event, instanceIdOverride);

  const sql = getDb(event);

  const rows = await sql<
    {
      collective_id: number;
      owner_page_id: number;
      icon: string;
    }[]
  >`
    SELECT collective_id, owner_page_id, icon
    FROM page_icons
    WHERE instance_id = ${instanceId}
      AND page_id = 0
  `;

  const map = new Map<number, PageIconRecord>();

  for (const row of rows) {
    map.set(Number(row.collective_id), {
      pageId: 0,
      ownerPageId: Number(row.owner_page_id),
      icon: row.icon,
    });
  }

  return map;
}

export async function getCollectiveLevelIcon(
  event: H3Event,
  collectiveId: number,
  instanceIdOverride?: number,
): Promise<PageIconRecord | null> {
  const instanceId = await getInstanceId(event, instanceIdOverride);

  const sql = getDb(event);

  const rows = await sql<
    {
      owner_page_id: number;
      icon: string;
    }[]
  >`
    SELECT owner_page_id, icon
    FROM page_icons
    WHERE instance_id = ${instanceId}
      AND collective_id = ${collectiveId}
      AND page_id = 0
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    pageId: 0,
    ownerPageId: Number(row.owner_page_id),
    icon: row.icon,
  };
}
