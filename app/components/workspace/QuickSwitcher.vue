<script setup lang="ts">
import { FileTextIcon } from "lucide-vue-next";
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
import { useQuickSwitcher } from "@/composables/useQuickSwitcher";

const {
  open,
  searchQuery,
  tagResults,
  parsedQuery,
  filteredGroupedItems,
  groupedTagResults,
  itemSearchValue,
  goToPage,
} = useQuickSwitcher();
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
