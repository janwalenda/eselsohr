import type { CollectivePageNode } from "~~/shared/collectives";
import { parsePageSearchQuery } from "~~/shared/search-query";
import { useEventListener } from "@vueuse/core";
import { flattenPageTree } from "@/composables/useCollectivePages";

type TagSearchResult = {
  collectiveId: number;
  collectiveName: string;
  pageId: number;
  title: string;
  tags: string[];
};

export function useQuickSwitcher() {
  const apiFetch = useApiFetch();

  const open = ref(false);

  const searchQuery = ref("");

  const pageMap = ref<Record<number, CollectivePageNode[]>>({});

  const tagResults = ref<TagSearchResult[]>([]);

  let tagSearchSeq = 0;

  const { collectives } = useCollectives();

  const parsedQuery = computed(() => parsePageSearchQuery(searchQuery.value));

  watch([open, collectives], async ([isOpen, items]) => {
    if (!isOpen) {
      return;
    }

    const entries = await Promise.all(
      items.map(async (collective) => {
        try {
          const response = await apiFetch<{ pages: CollectivePageNode[] }>(
            `/api/collectives/${collective.id}/pages`,
          );

          return [collective.id, response.pages] as const;
        } catch {
          return [collective.id, []] as const;
        }
      }),
    );

    pageMap.value = Object.fromEntries(entries);
  });

  watch(
    [open, parsedQuery],
    async ([isOpen, query]) => {
      if (!isOpen || !query.tag) {
        tagResults.value = [];
        return;
      }

      const seq = ++tagSearchSeq;

      const params = new URLSearchParams({ tag: query.tag });

      if (query.titleQuery) {
        params.set("q", query.titleQuery);
      }

      try {
        const response = await apiFetch<{ results: TagSearchResult[] }>(
          `/api/search/pages?${params.toString()}`,
        );

        if (seq === tagSearchSeq) {
          tagResults.value = response.results;
        }
      } catch {
        if (seq === tagSearchSeq) {
          tagResults.value = [];
        }
      }
    },
    { immediate: true },
  );

  useEventListener(window, "keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open.value = true;
    }
  });

  useEventListener(window, "workspace:open-switcher", () => {
    open.value = true;
  });

  const groupedItems = computed(() =>
    collectives.value.map((collective) => ({
      collective,
      pages: flattenPageTree(pageMap.value[collective.id] ?? []),
    })),
  );

  const filteredGroupedItems = computed(() => {
    if (parsedQuery.value.tag) {
      return [];
    }

    const titleQuery = parsedQuery.value.titleQuery.trim().toLowerCase();

    return groupedItems.value
      .map((group) => ({
        ...group,
        pages: titleQuery
          ? group.pages.filter((page) => page.title.toLowerCase().includes(titleQuery))
          : group.pages,
      }))
      .filter((group) => group.pages.length > 0);
  });

  const groupedTagResults = computed(() => {
    const groups = new Map<string, TagSearchResult[]>();

    for (const result of tagResults.value) {
      const bucket = groups.get(result.collectiveName) ?? [];

      bucket.push(result);
      groups.set(result.collectiveName, bucket);
    }

    return [...groups.entries()].map(([collectiveName, results]) => ({
      collectiveName,
      results,
    }));
  });

  function itemSearchValue(...parts: Array<string | number | undefined>) {
    return [...parts, searchQuery.value].filter(Boolean).join(" ");
  }

  async function goToPage(collectiveId: number, pageId: number) {
    open.value = false;
    await navigateTo(`/app/${collectiveId}/${pageId}`);
  }

  return {
    open,
    searchQuery,
    tagResults,
    parsedQuery,
    filteredGroupedItems,
    groupedTagResults,
    itemSearchValue,
    goToPage,
  };
}
