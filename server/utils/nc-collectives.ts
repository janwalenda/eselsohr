import type { H3Event } from "h3";
import type {
  CollectivePage,
  CollectivePageNode,
  CreateCollectiveInput,
  CreatePageInput,
  UpdatePageInput,
} from "../../shared/collectives";
import { buildCollectiveSummary } from "../../shared/collectives";
import { ncFetchJson } from "./nc-api";

type OcsResponse<T> = {
  ocs?: {
    data?: T;
  };
};

type NcCollective = {
  id: number;
  name: string;
  emoji?: string | null;
  canEdit?: boolean;
  circleId?: string;
  level?: number;
  editPermissionLevel?: number;
  sharePermissionLevel?: number;
  pageMode?: number;
  canShare?: boolean;
};

type NcCollectiveResponse = {
  collectives?: NcCollective[];
};

type NcCreateCollectiveResponse = {
  collective?: NcCollective;
};

type NcPageResponse = {
  page?: CollectivePage;
};

type NcPagesResponse = {
  pages?: CollectivePage[];
};

function collectivesPath(path = "") {
  return `/ocs/v2.php/apps/collectives/api/v1.0${path}`;
}

async function collectivesRequest<T>(
  event: H3Event,
  path: string,
  init: RequestInit = {},
): Promise<T> {
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

function requireCollective(data: NcCreateCollectiveResponse, action: string) {
  if (!data.collective) {
    throw createError({
      statusCode: 502,
      statusMessage: `Nextcloud did not return the ${action} collective`,
    });
  }

  return data.collective;
}

function sortPageNodes(nodes: CollectivePageNode[]) {
  nodes.sort((left, right) => left.title.localeCompare(right.title));

  for (const node of nodes) {
    const subpageOrder = new Map(node.subpageOrder.map((id, index) => [id, index]));

    node.children.sort((left, right) => {
      const leftIndex = subpageOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;

      const rightIndex = subpageOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      return leftIndex - rightIndex || left.title.localeCompare(right.title);
    });
    sortPageNodes(node.children);
  }
}

export function buildPageTree(pages: CollectivePage[]) {
  const nodes = new Map<number, CollectivePageNode>();

  const roots: CollectivePageNode[] = [];

  for (const page of pages) {
    nodes.set(page.id, {
      ...page,
      children: [],
    });
  }

  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId);

    if (parent) {
      parent.children.push(node);
      continue;
    }

    roots.push(node);
  }

  sortPageNodes(roots);
  return roots;
}

export async function listCollectives(event: H3Event) {
  const data = await collectivesRequest<NcCollectiveResponse>(event, "/collectives");

  const collectives = data.collectives ?? [];

  const withPaths = await Promise.all(
    collectives.map(async (collective) => {
      let path: string | null = null;

      try {
        const pages = await listPages(event, collective.id);

        path = pages.find((page) => page.collectivePath)?.collectivePath ?? null;
      } catch {
        // Ignore collectives we cannot list pages for.
      }

      return buildCollectiveSummary(collective, path);
    }),
  );

  return withPaths;
}

export async function createCollective(event: H3Event, input: CreateCollectiveInput) {
  const name = input.name.trim();

  const requestBody: Record<string, unknown> = { name };

  if (input.emoji) {
    requestBody.emoji = input.emoji;
  }

  const data = await collectivesRequest<NcCreateCollectiveResponse>(event, "/collectives", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (!data.collective) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return the created collective",
    });
  }

  return buildCollectiveSummary(data.collective, null);
}

export async function updateCollectiveEmoji(
  event: H3Event,
  collectiveId: number,
  emoji: string | null,
) {
  const data = await collectivesRequest<NcCreateCollectiveResponse>(
    event,
    `/collectives/${collectiveId}`,
    {
      method: "PUT",
      body: JSON.stringify({ emoji }),
    },
  );

  return buildCollectiveSummary(requireCollective(data, "updated"));
}

export async function setCollectiveEditLevel(event: H3Event, collectiveId: number, level: number) {
  const data = await collectivesRequest<NcCreateCollectiveResponse>(
    event,
    `/collectives/${collectiveId}/editLevel`,
    {
      method: "PUT",
      body: JSON.stringify({ level }),
    },
  );

  return buildCollectiveSummary(requireCollective(data, "updated"));
}

export async function setCollectiveShareLevel(event: H3Event, collectiveId: number, level: number) {
  const data = await collectivesRequest<NcCreateCollectiveResponse>(
    event,
    `/collectives/${collectiveId}/shareLevel`,
    {
      method: "PUT",
      body: JSON.stringify({ level }),
    },
  );

  return buildCollectiveSummary(requireCollective(data, "updated"));
}

export async function setCollectivePageMode(event: H3Event, collectiveId: number, mode: number) {
  const data = await collectivesRequest<NcCreateCollectiveResponse>(
    event,
    `/collectives/${collectiveId}/pageMode`,
    {
      method: "PUT",
      body: JSON.stringify({ mode }),
    },
  );

  return buildCollectiveSummary(requireCollective(data, "updated"));
}

export async function trashCollective(event: H3Event, collectiveId: number) {
  const data = await collectivesRequest<NcCreateCollectiveResponse>(
    event,
    `/collectives/${collectiveId}`,
    {
      method: "DELETE",
    },
  );

  return buildCollectiveSummary(requireCollective(data, "trashed"));
}

export async function listPages(event: H3Event, collectiveId: number) {
  const data = await collectivesRequest<NcPagesResponse>(
    event,
    `/collectives/${collectiveId}/pages`,
  );

  return data.pages ?? [];
}

export async function listPageTree(event: H3Event, collectiveId: number) {
  return buildPageTree(await listPages(event, collectiveId));
}

export async function getPage(event: H3Event, collectiveId: number, pageId: number) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}`,
  );

  if (!data.page) {
    throw createError({ statusCode: 404, statusMessage: "Page not found" });
  }

  return data.page;
}

export async function createPage(event: H3Event, collectiveId: number, input: CreatePageInput) {
  const parentId = input.parentId ?? 0;

  const title = input.title.trim();

  const requestBody = {
    title,
    parentId,
    templateId: null,
  };

  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${parentId}`,
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
  );

  if (!data.page) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return the created page",
    });
  }

  return data.page;
}

export async function renamePage(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  title: string,
) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}`,
    {
      method: "PUT",
      body: JSON.stringify({ title }),
    },
  );

  if (!data.page) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return the renamed page",
    });
  }

  return data.page;
}

export async function movePage(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  input: Pick<UpdatePageInput, "parentId" | "index" | "title">,
) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        parentId: input.parentId ?? null,
        index: input.index ?? 0,
        title: input.title ?? null,
        copy: false,
      }),
    },
  );

  if (!data.page) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return the moved page",
    });
  }

  return data.page;
}

export async function setSubpageOrder(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  subpageOrder: number[],
) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}/subpageOrder`,
    {
      method: "PUT",
      body: JSON.stringify({
        subpageOrder: JSON.stringify(subpageOrder),
      }),
    },
  );

  if (!data.page) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return the updated page order",
    });
  }

  return data.page;
}

export async function updatePage(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  input: UpdatePageInput,
) {
  if (input.subpageOrder) {
    return setSubpageOrder(event, collectiveId, pageId, input.subpageOrder);
  }

  if (input.parentId !== undefined || input.index !== undefined) {
    return movePage(event, collectiveId, pageId, input);
  }

  if (input.title !== undefined) {
    return renamePage(event, collectiveId, pageId, input.title);
  }

  return getPage(event, collectiveId, pageId);
}

export async function deletePage(event: H3Event, collectiveId: number, pageId: number) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}`,
    {
      method: "DELETE",
    },
  );

  if (!data.page) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud did not return the trashed page",
    });
  }

  return data.page;
}
