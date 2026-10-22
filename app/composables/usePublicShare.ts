import type { CollectivePageNode, PageContentPayload } from "~~/shared/collectives";
import { computed, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

type PublicShareMapping = {
  token: string;
  ncUrl: string;
  collectiveId: number;
  pageId: number | null;
  createdBy: string | null;
  createdAt: string;
};

export function usePublicShare(
  tokenSource: MaybeRefOrGetter<string>,
  pageIdSource: MaybeRefOrGetter<number | null | undefined>,
) {
  const apiFetch = useApiFetch();

  const token = computed(() => String(toValue(tokenSource) || "").trim());

  const pageId = computed(() => {
    const value = toValue(pageIdSource);

    return typeof value === "number" && Number.isFinite(value) ? value : null;
  });

  const pagesKey = computed(() => `public-share-pages:${token.value}`);

  const pagesData = useAsyncData(
    () => pagesKey.value,
    async () => {
      if (!token.value) {
        return {
          share: null as PublicShareMapping | null,
          pages: [] as CollectivePageNode[],
        };
      }

      return await apiFetch<{
        share: PublicShareMapping;
        pages: CollectivePageNode[];
      }>(`/api/public/s/${encodeURIComponent(token.value)}/pages`);
    },
    {
      watch: [token],
      default: () => ({
        share: null,
        pages: [],
      }),
    },
  );

  const resolvedPageId = computed(() => {
    if (pageId.value) {
      return pageId.value;
    }

    if (pagesData.data.value?.share?.pageId) {
      return pagesData.data.value.share.pageId;
    }

    return pagesData.data.value?.pages?.[0]?.id ?? null;
  });

  const contentKey = computed(
    () => `public-share-content:${token.value}:${resolvedPageId.value ?? "none"}`,
  );

  const contentData = useAsyncData(
    () => contentKey.value,
    async () => {
      if (!token.value || !resolvedPageId.value) {
        return null as PageContentPayload | null;
      }

      const response = await apiFetch<PageContentPayload>(
        `/api/public/s/${encodeURIComponent(token.value)}/pages/${resolvedPageId.value}/content`,
      );

      return response;
    },
    {
      watch: [token, resolvedPageId],
      default: () => null,
    },
  );

  return {
    share: computed(() => pagesData.data.value?.share ?? null),
    pages: computed(() => pagesData.data.value?.pages ?? []),
    pagesPending: pagesData.pending,
    pagesError: pagesData.error,
    pageId: resolvedPageId,
    pageContent: computed(() => contentData.data.value),
    contentPending: contentData.pending,
    contentError: contentData.error,
    refresh: async () => {
      await pagesData.refresh();
      await contentData.refresh();
    },
  };
}
