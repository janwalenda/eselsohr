import type { PageProperties } from "./properties";

export type CollectiveSummary = {
  id: number;
  name: string;
  emoji?: string | null;
  slug: string;
  path?: string | null;
  canEdit?: boolean;
  circleId?: string;
  level?: number;
  editPermissionLevel?: number;
  sharePermissionLevel?: number;
  pageMode?: number;
  canShare?: boolean;
};

export type CollectivePage = {
  id: number;
  title: string;
  emoji?: string | null;
  parentId: number;
  subpageOrder: number[];
  timestamp: number;
  size: number;
  fileName: string;
  filePath: string;
  collectivePath: string;
  isFullWidth: boolean;
  lastUserId?: string;
  lastUserDisplayName?: string;
};

export type CollectivePageNode = CollectivePage & {
  children: CollectivePageNode[];
};

export function flattenPageTree(nodes: CollectivePageNode[]): CollectivePage[] {
  return nodes.flatMap((node) => [node, ...flattenPageTree(node.children ?? [])]);
}

export type PageContentPayload = {
  page: CollectivePage;
  properties: PageProperties;
  content: string;
  etag: string | null;
};

export type CreateCollectiveInput = {
  name: string;
  emoji?: string | null;
};

export type UpdateCollectiveInput = {
  name?: string;
  emoji?: string | null;
  editLevel?: number;
  shareLevel?: number;
  pageMode?: number;
};

export const COLLECTIVE_MEMBER_LEVELS = {
  member: 1,
  moderator: 4,
  admin: 8,
} as const;

export const COLLECTIVE_PAGE_MODES = {
  edit: 0,
  view: 1,
} as const;

export type EmojiValidationResult = { valid: true } | { valid: false; message: string };

/** Nextcloud stores emojis in a VARCHAR(8) column and enforces this code point limit. */
const EMOJI_MAX_CODE_POINTS = 8;

function countGraphemes(value: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

    let count = 0;

    for (const _segment of segmenter.segment(value)) {
      count += 1;
    }

    return count;
  }

  // Fallback for runtimes without Intl.Segmenter: count code points. This cannot
  // merge ZWJ/variation sequences, so the server stays the source of truth.
  return [...value].length;
}

/**
 * Mirrors Nextcloud Collectives' `EmojiHelper::assertValid` so we can reject
 * emojis the API refuses (flags, keycaps, plain characters) before sending them
 * and surface a clear message instead of a raw "Emoji is not valid" 400.
 */
export function validateCollectiveEmoji(emoji: string | null | undefined): EmojiValidationResult {
  if (emoji === null || emoji === undefined || emoji === "") {
    return { valid: true };
  }

  // Mirror Nextcloud's rejection of control characters in emoji values.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/u.test(emoji)) {
    return { valid: false, message: "Das Emoji enthält ungültige Zeichen." };
  }

  if (countGraphemes(emoji) !== 1) {
    return { valid: false, message: "Bitte gib genau ein einzelnes Emoji an." };
  }

  if (!/\p{Extended_Pictographic}/u.test(emoji)) {
    return {
      valid: false,
      message:
        "Dieses Zeichen wird von Nextcloud nicht als Emoji akzeptiert (Flaggen- und Ziffern-Emojis werden z. B. nicht unterstützt).",
    };
  }

  if ([...emoji].length > EMOJI_MAX_CODE_POINTS) {
    return { valid: false, message: "Das Emoji ist zu lang." };
  }

  return { valid: true };
}

export function slugifyCollectiveName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCollectiveSummary(
  collective: {
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
  },
  path: string | null = null,
): CollectiveSummary {
  return {
    id: collective.id,
    name: collective.name,
    emoji: collective.emoji ?? null,
    canEdit: collective.canEdit ?? false,
    slug: slugifyCollectiveName(collective.name),
    path,
    circleId: collective.circleId,
    level: collective.level,
    editPermissionLevel: collective.editPermissionLevel,
    sharePermissionLevel: collective.sharePermissionLevel,
    pageMode: collective.pageMode,
    canShare: collective.canShare,
  };
}

export type CreatePageInput = {
  title: string;
  parentId?: number;
};

export type UpdatePageInput = {
  title?: string;
  parentId?: number | null;
  index?: number | null;
  subpageOrder?: number[];
};

/** Collective landing/index page (`Readme.md` at collective root). */
export function isLandingPage(
  page: Pick<CollectivePage, "fileName" | "filePath" | "parentId">,
): boolean {
  return page.fileName === "Readme.md" && !page.filePath?.trim() && page.parentId === 0;
}

export function resolveCreateParentId(
  page: Pick<CollectivePage, "id" | "fileName" | "filePath" | "parentId">,
): number {
  return page.id;
}

/** Parent ID for creating a sibling page next to `page` (same folder in the tree). */
export function resolveSiblingCreateParentId(
  page: Pick<CollectivePage, "id" | "parentId">,
): number {
  return page.parentId === 0 ? page.id : page.parentId;
}
