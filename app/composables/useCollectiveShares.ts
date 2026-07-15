import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

type CollectiveShareItem = {
  id: number;
  collectiveId: number;
  pageId: number;
  token: string;
  owner: string;
  editable: boolean;
  hasPassword: boolean;
  url: string;
};

export function useCollectiveShares(collectiveId: MaybeRefOrGetter<number | string>) {
  const apiFetch = useApiFetch();

  const resolvedCollectiveId = computed(() => Number(toValue(collectiveId)));

  const key = computed(() => `collective-shares:${resolvedCollectiveId.value}`);

  const asyncData = useAsyncData(
    () => key.value,
    async () => {
      if (!Number.isFinite(resolvedCollectiveId.value)) {
        return [];
      }

      const response = await apiFetch<{ shares: CollectiveShareItem[] }>(
        `/api/collectives/${resolvedCollectiveId.value}/shares`,
      );

      return response.shares;
    },
    {
      watch: [resolvedCollectiveId],
      default: () => [],
    },
  );

  async function createPageShare(pageId: number) {
    const response = await apiFetch<{ share: CollectiveShareItem }>(
      `/api/collectives/${resolvedCollectiveId.value}/pages/${pageId}/shares`,
      {
        method: "POST",
      },
    );

    await asyncData.refresh();
    return response.share;
  }

  async function deleteShare(share: CollectiveShareItem) {
    const path =
      share.pageId > 0
        ? `/api/collectives/${share.collectiveId}/pages/${share.pageId}/shares/${share.token}`
        : `/api/collectives/${share.collectiveId}/shares/${share.token}`;

    await apiFetch(path, { method: "DELETE" });
    await asyncData.refresh();
  }

  return {
    ...asyncData,
    shares: asyncData.data,
    createPageShare,
    deleteShare,
  };
}
