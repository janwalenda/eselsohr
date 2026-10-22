import type { H3Event } from "h3";
import { ncFetchJson } from "./nc-api";

export type CollectiveShare = {
  id: number;
  collectiveId: number;
  pageId: number;
  token: string;
  owner: string;
  editable: boolean;
  hasPassword: boolean;
};

type OcsResponse<T> = {
  ocs?: {
    data?: T;
  };
};

function collectivesPath(path = "") {
  return `/ocs/v2.php/apps/collectives/api/v1.0${path}`;
}

async function sharesRequest<T>(event: H3Event, path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {};

  if (init.body && !(init.headers && new Headers(init.headers).has("Content-Type"))) {
    headers["Content-Type"] = "application/json";
  }

  const response = await ncFetchJson<OcsResponse<T>>(event, collectivesPath(path), {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    },
  });

  return (response.ocs?.data ?? {}) as T;
}

export async function listCollectiveShares(event: H3Event, collectiveId: number) {
  return await sharesRequest<CollectiveShare[]>(event, `/collectives/${collectiveId}/shares`);
}

export async function createCollectiveShare(
  event: H3Event,
  collectiveId: number,
  password?: string | null,
) {
  return await sharesRequest<CollectiveShare>(event, `/collectives/${collectiveId}/shares`, {
    method: "POST",
    body: JSON.stringify({ password: password || undefined }),
  });
}

export async function createPageShare(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  password?: string | null,
) {
  return await sharesRequest<CollectiveShare>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}/shares`,
    {
      method: "POST",
      body: JSON.stringify({ password: password || undefined }),
    },
  );
}

export async function deleteCollectiveShare(event: H3Event, collectiveId: number, token: string) {
  await sharesRequest(event, `/collectives/${collectiveId}/shares/${token}`, {
    method: "DELETE",
  });
}

export async function deletePageShare(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  token: string,
) {
  await sharesRequest(event, `/collectives/${collectiveId}/pages/${pageId}/shares/${token}`, {
    method: "DELETE",
  });
}
