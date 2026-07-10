import type { H3Event } from 'h3'
import type {
  CollectivePage,
  CollectivePageNode,
  CollectiveSummary,
  CreatePageInput,
  UpdatePageInput,
} from '../../shared/collectives'
import { ncFetchJson } from './nc-api'

type OcsResponse<T> = {
  ocs?: {
    data?: T
  }
}

type NcCollectiveResponse = {
  collectives?: Array<{
    id: number
    name: string
    emoji?: string | null
    canEdit?: boolean
  }>
}

type NcPageResponse = {
  page?: CollectivePage
}

type NcPagesResponse = {
  pages?: CollectivePage[]
}

function collectivesPath(path = '') {
  return `/ocs/v2.php/apps/collectives/api/v1.0${path}`
}

async function collectivesRequest<T>(
  event: H3Event,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (init.body && !(init.headers && new Headers(init.headers).has('Content-Type'))) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await ncFetchJson<OcsResponse<T>>(event, collectivesPath(path), {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    },
  })

  return (response.ocs?.data ?? {}) as T
}

function slugifyCollectiveName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function sortPageNodes(nodes: CollectivePageNode[]) {
  nodes.sort((left, right) => left.title.localeCompare(right.title))

  for (const node of nodes) {
    const subpageOrder = new Map(node.subpageOrder.map((id, index) => [id, index]))
    node.children.sort((left, right) => {
      const leftIndex = subpageOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = subpageOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex || left.title.localeCompare(right.title)
    })
    sortPageNodes(node.children)
  }
}

export function buildPageTree(pages: CollectivePage[]) {
  const nodes = new Map<number, CollectivePageNode>()
  const roots: CollectivePageNode[] = []

  for (const page of pages) {
    nodes.set(page.id, {
      ...page,
      children: [],
    })
  }

  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId)
    if (parent) {
      parent.children.push(node)
      continue
    }
    roots.push(node)
  }

  sortPageNodes(roots)
  return roots
}

export async function listCollectives(event: H3Event) {
  const data = await collectivesRequest<NcCollectiveResponse>(event, '/collectives')
  const collectives = data.collectives ?? []

  const withPaths = await Promise.all(collectives.map(async (collective) => {
    let path: string | null = null
    try {
      const pages = await listPages(event, collective.id)
      path = pages.find(page => page.collectivePath)?.collectivePath ?? null
    }
    catch {
      path = null
    }

    return {
      id: collective.id,
      name: collective.name,
      emoji: collective.emoji ?? null,
      canEdit: collective.canEdit ?? false,
      slug: slugifyCollectiveName(collective.name),
      path,
    } satisfies CollectiveSummary
  }))

  return withPaths
}

export async function listPages(event: H3Event, collectiveId: number) {
  const data = await collectivesRequest<NcPagesResponse>(event, `/collectives/${collectiveId}/pages`)
  return data.pages ?? []
}

export async function listPageTree(event: H3Event, collectiveId: number) {
  return buildPageTree(await listPages(event, collectiveId))
}

export async function getPage(event: H3Event, collectiveId: number, pageId: number) {
  const data = await collectivesRequest<NcPageResponse>(event, `/collectives/${collectiveId}/pages/${pageId}`)
  if (!data.page) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }
  return data.page
}

export async function createPage(event: H3Event, collectiveId: number, input: CreatePageInput) {
  const parentId = input.parentId ?? 0
  const title = input.title.trim()
  const requestBody = {
    title,
    parentId,
    templateId: null,
  }

  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${parentId}`,
    {
      method: 'POST',
      body: JSON.stringify(requestBody),
    },
  )

  if (!data.page) {
    throw createError({ statusCode: 502, statusMessage: 'Nextcloud did not return the created page' })
  }

  return data.page
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
      method: 'PUT',
      body: JSON.stringify({ title }),
    },
  )

  if (!data.page) {
    throw createError({ statusCode: 502, statusMessage: 'Nextcloud did not return the renamed page' })
  }

  return data.page
}

export async function movePage(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  input: Pick<UpdatePageInput, 'parentId' | 'index' | 'title'>,
) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        parentId: input.parentId ?? null,
        index: input.index ?? 0,
        title: input.title ?? null,
        copy: false,
      }),
    },
  )

  if (!data.page) {
    throw createError({ statusCode: 502, statusMessage: 'Nextcloud did not return the moved page' })
  }

  return data.page
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
      method: 'PUT',
      body: JSON.stringify({
        subpageOrder: JSON.stringify(subpageOrder),
      }),
    },
  )

  if (!data.page) {
    throw createError({ statusCode: 502, statusMessage: 'Nextcloud did not return the updated page order' })
  }

  return data.page
}

export async function updatePage(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  input: UpdatePageInput,
) {
  if (input.subpageOrder) {
    return setSubpageOrder(event, collectiveId, pageId, input.subpageOrder)
  }

  if (input.parentId !== undefined || input.index !== undefined) {
    return movePage(event, collectiveId, pageId, input)
  }

  if (input.title !== undefined) {
    return renamePage(event, collectiveId, pageId, input.title)
  }

  return getPage(event, collectiveId, pageId)
}

export async function deletePage(event: H3Event, collectiveId: number, pageId: number) {
  const data = await collectivesRequest<NcPageResponse>(
    event,
    `/collectives/${collectiveId}/pages/${pageId}`,
    {
      method: 'DELETE',
    },
  )

  if (!data.page) {
    throw createError({ statusCode: 502, statusMessage: 'Nextcloud did not return the trashed page' })
  }

  return data.page
}
