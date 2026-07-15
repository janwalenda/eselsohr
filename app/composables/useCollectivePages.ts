import type {
  CollectivePage,
  CollectivePageNode,
  CreatePageInput,
  UpdatePageInput,
} from '~~/shared/collectives'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'

export function flattenPageTree(nodes: CollectivePageNode[]): CollectivePage[] {
  return nodes.flatMap(node => [node, ...flattenPageTree(node.children)])
}

export function findPageInTree(nodes: CollectivePageNode[], pageId: number): CollectivePageNode | null {
  for (const node of nodes) {
    if (node.id === pageId) {
      return node
    }

    const child = findPageInTree(node.children, pageId)
    if (child) {
      return child
    }
  }

  return null
}

export function getPageBreadcrumb(nodes: CollectivePageNode[], pageId: number): CollectivePageNode[] {
  for (const node of nodes) {
    if (node.id === pageId) {
      return [node]
    }

    const childTrail = getPageBreadcrumb(node.children, pageId)
    if (childTrail.length > 0) {
      return [node, ...childTrail]
    }
  }

  return []
}

export function useCollectivePages(collectiveIdSource: MaybeRefOrGetter<number | string>) {
  const apiFetch = useApiFetch()
  const collectiveId = computed(() => Number(toValue(collectiveIdSource)))
  const key = computed(() => `collective-pages:${collectiveId.value}`)

  const asyncData = useAsyncData(
    () => key.value,
    async () => {
      if (!Number.isFinite(collectiveId.value)) {
        return []
      }

      const response = await apiFetch<{ pages: CollectivePageNode[] }>(
        `/api/collectives/${collectiveId.value}/pages`,
      )
      return response.pages
    },
    {
      watch: [collectiveId],
      default: () => [],
    },
  )

  async function refreshPages() {
    await asyncData.refresh()
  }

  async function createPage(input: CreatePageInput) {
    const response = await apiFetch<{ page: CollectivePage }>(
      `/api/collectives/${collectiveId.value}/pages`,
      {
        method: 'POST',
        body: input,
      },
    )
    await refreshPages()
    return response.page
  }

  async function updatePage(pageId: number, input: UpdatePageInput) {
    const response = await apiFetch<{ page: CollectivePage }>(
      `/api/collectives/${collectiveId.value}/pages/${pageId}`,
      {
        method: 'PATCH',
        body: input,
      },
    )
    await refreshPages()
    return response.page
  }

  async function deletePage(pageId: number) {
    const response = await apiFetch<{ page: CollectivePage }>(
      `/api/collectives/${collectiveId.value}/pages/${pageId}`,
      {
        method: 'DELETE',
      },
    )
    await refreshPages()
    return response.page
  }

  const flatPages = computed(() => flattenPageTree(asyncData.data.value ?? []))

  return {
    ...asyncData,
    pages: asyncData.data,
    flatPages,
    refreshPages,
    createPage,
    updatePage,
    deletePage,
  }
}
