<script setup lang="ts">
import type { CollectivePageNode } from "~~/shared/collectives";
import { parsePageSearchQuery } from "~~/shared/search-query";
import { useEventListener } from "@vueuse/core";
import { FileTextIcon } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { flattenPageTree } from "@/composables/useCollectivePages";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import QuickSwitcherQuerySync from "@/components/workspace/QuickSwitcherQuerySync.vue";

type TagSearchResult = {
  collectiveId: number;
  collectiveName: string;
  pageId: number;
  title: string;
  tags: string[];
};

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

      if (seq !== tagSearchSeq) {
        return;
      }

      tagResults.value = response.results;
    } catch {
      if (seq !== tagSearchSeq) {
        return;
      }

      tagResults.value = [];
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
</script>

<template>
  <CommandDialog
    v-model:open="open"
    title="Seite wechseln"
    description="Suche nach Collectives, Seiten oder Tags."
    :filter-disabled="!!parsedQuery.tag"
  >
    <CommandInput placeholder="Seiten durchsuchen… (z. B. tags:entwurf)" />
    <QuickSwitcherQuerySync @change="searchQuery = $event" />
    <CommandList>
      <CommandEmpty v-if="!parsedQuery.tag || tagResults.length === 0">
        {{
          parsedQuery.tag
            ? "Keine Seiten mit diesem Tag gefunden."
            : "Keine passende Seite gefunden."
        }}
      </CommandEmpty>

      <template v-if="parsedQuery.tag">
        <CommandGroup
          v-for="group in groupedTagResults"
          :key="group.collectiveName"
          :heading="group.collectiveName"
        >
          <CommandItem
            v-for="result in group.results"
            :key="`${result.collectiveId}-${result.pageId}`"
            :value="
              itemSearchValue(result.title, result.collectiveName, ...result.tags, parsedQuery.tag)
            "
            @select="goToPage(result.collectiveId, result.pageId)"
          >
            <span class="sr-only">{{ searchQuery }}</span>
            <FileTextIcon class="mr-2 size-4" />
            <div class="flex min-w-0 flex-1 flex-col">
              <span>{{ result.title }}</span>
              <span v-if="result.tags.length > 0" class="text-xs text-muted-foreground">
                {{ result.tags.map((tag) => `#${tag}`).join(" ") }}
              </span>
            </div>
            <CommandShortcut>{{ result.collectiveName }}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </template>

      <template v-else>
        <CommandGroup
          v-for="group in filteredGroupedItems"
          :key="group.collective.id"
          :heading="group.collective.name"
        >
          <CommandItem
            v-for="page in group.pages"
            :key="page.id"
            :value="itemSearchValue(page.title, group.collective.name)"
            @select="goToPage(group.collective.id, page.id)"
          >
            <FileTextIcon class="mr-2 size-4" />
            <span>{{ page.title }}</span>
            <CommandShortcut>{{ group.collective.name }}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </template>
    </CommandList>
  </CommandDialog>
</template>
