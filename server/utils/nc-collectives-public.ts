import type { CollectivePage, CollectivePageNode } from "../../shared/collectives";
import { normalizeNcUrl, createNcConnectivityError } from "./nc-api";
import { buildPageTree } from "./nc-collectives";

type OcsResponse<T> = {
  ocs?: {
    data?: T;
  };
};

type PublicPagesResponse = {
  pages?: CollectivePage[];
};

type PublicPageResponse = {
  page?: CollectivePage;
};

function collectivesPublicPath(token: string, path = "") {
  return `/ocs/v2.php/apps/collectives/api/v1.0/p/collectives/${encodeURIComponent(token)}${path}`;
}

function joinNcUrl(baseUrl: string, path: string) {
  const normalizedBase = `${normalizeNcUrl(baseUrl)}/`;

  const normalizedPath = path.replace(/^\/+/, "");

  return new URL(normalizedPath, normalizedBase).toString();
}

async function publicFetchJson<T>(ncUrl: string, token: string, path: string) {
  const targetUrl = joinNcUrl(ncUrl, collectivesPublicPath(token, path));

  let response: Response;

  try {
    response = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "OCS-APIRequest": "true",
      },
    });
  } catch (error) {
    throw createNcConnectivityError(targetUrl, error);
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage:
        response.status === 404
          ? "Public share not found on Nextcloud"
          : "Failed to load public share from Nextcloud",
      data: await response.text(),
    });
  }

  return (await response.json()) as OcsResponse<T>;
}

export async function listPublicPages(ncUrl: string, token: string) {
  const response = await publicFetchJson<PublicPagesResponse>(ncUrl, token, "/pages");

  return response.ocs?.data?.pages ?? [];
}

export async function listPublicPageTree(
  ncUrl: string,
  token: string,
): Promise<CollectivePageNode[]> {
  return buildPageTree(await listPublicPages(ncUrl, token));
}

export async function getPublicPage(ncUrl: string, token: string, pageId: number) {
  const response = await publicFetchJson<PublicPageResponse>(ncUrl, token, `/pages/${pageId}`);

  const page = response.ocs?.data?.page;

  if (!page) {
    throw createError({ statusCode: 404, statusMessage: "Shared page not found" });
  }

  return page;
}
