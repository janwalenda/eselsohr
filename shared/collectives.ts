export type CollectiveSummary = {
  id: number
  name: string
  emoji?: string | null
  slug: string
  path?: string | null
  canEdit?: boolean
}

export type CollectivePage = {
  id: number
  title: string
  emoji?: string | null
  parentId: number
  subpageOrder: number[]
  timestamp: number
  size: number
  fileName: string
  filePath: string
  collectivePath: string
  isFullWidth: boolean
  lastUserId?: string
  lastUserDisplayName?: string
}

export type CollectivePageNode = CollectivePage & {
  children: CollectivePageNode[]
}

export type PageContentPayload = {
  page: CollectivePage
  content: string
  etag: string | null
}

export type CreatePageInput = {
  title: string
  parentId?: number
}

export type UpdatePageInput = {
  title?: string
  parentId?: number | null
  index?: number | null
  subpageOrder?: number[]
}

/** Collective landing/index page (`Readme.md` at collective root). */
export function isLandingPage(page: Pick<CollectivePage, 'fileName' | 'filePath' | 'parentId'>): boolean {
  return page.fileName === 'Readme.md' && !page.filePath?.trim() && page.parentId === 0
}

export function resolveCreateParentId(
  page: Pick<CollectivePage, 'id' | 'fileName' | 'filePath' | 'parentId'>,
): number {
  return page.id
}
