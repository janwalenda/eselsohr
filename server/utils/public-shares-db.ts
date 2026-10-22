import type { H3Event } from "h3";
import { getDb } from "./db";

export type PublicShareRecord = {
  token: string;
  ncUrl: string;
  collectiveId: number;
  pageId: number | null;
  createdBy: string | null;
  createdAt: string;
};

type PublicShareRow = {
  token: string;
  nc_url: string;
  collective_id: number;
  page_id: number | null;
  created_by: string | null;
  created_at: string | Date;
};

function toPublicShareRecord(row: PublicShareRow): PublicShareRecord {
  return {
    token: row.token,
    ncUrl: row.nc_url,
    collectiveId: Number(row.collective_id),
    pageId: row.page_id === null ? null : Number(row.page_id),
    createdBy: row.created_by,
    createdAt: typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
  };
}

export async function upsertNcInstance(event: H3Event, ncUrl: string) {
  const sql = getDb(event);

  const [row] = await sql<{ id: number }[]>`
    INSERT INTO nc_instances (nc_url)
    VALUES (${ncUrl})
    ON CONFLICT (nc_url) DO UPDATE SET nc_url = EXCLUDED.nc_url
    RETURNING id
  `;

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: "Could not store Nextcloud instance" });
  }

  return Number(row.id);
}

export async function insertPublicShare(
  event: H3Event,
  input: {
    token: string;
    instanceId: number;
    collectiveId: number;
    pageId: number | null;
    createdBy: string | null;
  },
) {
  const sql = getDb(event);

  const [row] = await sql<PublicShareRow[]>`
    INSERT INTO public_shares (
      token,
      instance_id,
      collective_id,
      page_id,
      created_by
    )
    VALUES (
      ${input.token},
      ${input.instanceId},
      ${input.collectiveId},
      ${input.pageId},
      ${input.createdBy}
    )
    ON CONFLICT (token) DO UPDATE SET
      instance_id = EXCLUDED.instance_id,
      collective_id = EXCLUDED.collective_id,
      page_id = EXCLUDED.page_id,
      created_by = EXCLUDED.created_by
    RETURNING
      token,
      collective_id,
      page_id,
      created_by,
      created_at,
      (
        SELECT nc_url
        FROM nc_instances
        WHERE id = public_shares.instance_id
      ) AS nc_url
  `;

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: "Could not store public share mapping" });
  }

  return toPublicShareRecord(row);
}

export async function getPublicShareByToken(event: H3Event, token: string) {
  const sql = getDb(event);

  const [row] = await sql<PublicShareRow[]>`
    SELECT
      ps.token,
      ps.collective_id,
      ps.page_id,
      ps.created_by,
      ps.created_at,
      ni.nc_url
    FROM public_shares ps
    JOIN nc_instances ni ON ni.id = ps.instance_id
    WHERE ps.token = ${token}
  `;

  return row ? toPublicShareRecord(row) : null;
}

export async function deletePublicShareByToken(event: H3Event, token: string) {
  const sql = getDb(event);

  await sql`
    DELETE FROM public_shares
    WHERE token = ${token}
  `;
}
