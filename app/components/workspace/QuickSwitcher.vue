<script setup lang="ts">
import type { CollectivePageNode } from '~~/shared/collectives'
import { useEventListener } from '@vueuse/core'
import { FileTextIcon } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { flattenPageTree } from '@/composables/useCollectivePages'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'

const apiFetch = useApiFetch()
const open = ref(false)
const pageMap = ref<Record<number, CollectivePageNode[]>>({})
const { collectives } = useCollectives()

watch(
  [open, collectives],
  async ([isOpen, items]) => {
    if (!isOpen) {
      return
    }
    const entries = await Promise.all(items.map(async (collective) => {
      try {
        const response = await apiFetch<{ pages: CollectivePageNode[] }>(
          `/api/collectives/${collective.id}/pages`,
        )
        return [collective.id, response.pages] as const
      }
      catch {
        return [collective.id, []] as const
      }
    }))

    pageMap.value = Object.fromEntries(entries)
  },
)

useEventListener(window, 'keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    open.value = true
  }
})

useEventListener(window, 'workspace:open-switcher', () => {
  open.value = true
})

const groupedItems = computed(() =>
  collectives.value.map(collective => ({
    collective,
    pages: flattenPageTree(pageMap.value[collective.id] ?? []),
  })),
)

async function goToPage(collectiveId: number, pageId: number) {
  open.value = false
  await navigateTo(`/app/${collectiveId}/${pageId}`)
}
</script>

<template>
  <CommandDialog
    v-model:open="open"
    title="Seite wechseln"
    description="Suche nach Collectives und Seiten."
  >
    <CommandInput placeholder="Seiten durchsuchen..." />
    <CommandList>
      <CommandEmpty>Keine passende Seite gefunden.</CommandEmpty>

      <CommandGroup
        v-for="group in groupedItems"
        :key="group.collective.id"
        :heading="group.collective.name"
      >
        <CommandItem
          v-for="page in group.pages"
          :key="page.id"
          :value="`${group.collective.name} ${page.title}`"
          @select="goToPage(group.collective.id, page.id)"
        >
          <FileTextIcon class="mr-2 size-4" />
          <span>{{ page.title }}</span>
          <CommandShortcut>{{ group.collective.name }}</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
