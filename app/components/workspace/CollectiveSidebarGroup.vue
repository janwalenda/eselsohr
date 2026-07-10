<script setup lang="ts">
import type { CollectiveSummary } from '~~/shared/collectives'
import { extractApiErrorMessage } from '~~/shared/api-errors'
import { toast } from 'vue-sonner'
import { FilePlus2Icon, ChevronRightIcon, FolderOpenIcon } from 'lucide-vue-next'
import CollectiveSidebarPages from '@/components/workspace/CollectiveSidebarPages.vue'
import CreatePageDialog from '@/components/workspace/CreatePageDialog.vue'
import { navigateToCollective } from '@/composables/useCollectiveNavigation'
import { useCollectivePages } from '@/composables/useCollectivePages'
import { Button } from '@/components/ui/button'
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const props = defineProps<{
  collective: CollectiveSummary
  activePageId?: number | null
  isActive: boolean
}>()

const createOpen = ref(false)
const openingCollective = ref(false)
const pagesExpanded = ref(true)

const { landingPage, createPage } = useCollectivePages(() =>
  props.isActive ? props.collective.id : Number.NaN,
)

const landingPageId = computed(() => landingPage.value?.id ?? null)

const isCollectiveDocumentActive = computed(() =>
  props.isActive
  && (!props.activePageId || props.activePageId === landingPageId.value),
)

async function openCollective() {
  if (openingCollective.value) {
    return
  }
  openingCollective.value = true
  try {
    await navigateToCollective(props.collective.id)
  }
  finally {
    openingCollective.value = false
  }
}

async function handleCollectiveClick() {
  if (!props.isActive) {
    await openCollective()
    return
  }

  if (landingPageId.value && props.activePageId !== landingPageId.value) {
    await navigateTo(`/app/${props.collective.id}/${landingPageId.value}`)
    pagesExpanded.value = true
    return
  }

  pagesExpanded.value = !pagesExpanded.value
}

watch(() => props.isActive, (active) => {
  if (active) {
    pagesExpanded.value = true
  }
})

function toMessage(error: unknown) {
  return extractApiErrorMessage(error)
}

async function handleCreate(title: string) {
  try {
    const rootParentId = landingPageId.value
    if (!rootParentId) {
      throw new Error('Die Landing-Page des Collectives konnte nicht gefunden werden.')
    }
    const page = await createPage({ title, parentId: rootParentId })
    toast.success('Seite erstellt')
    await navigateTo(`/app/${props.collective.id}/${page.id}`)
  }
  catch (createError) {
    toast.error(toMessage(createError))
  }
}
</script>

<template>
  <SidebarMenuItem class="space-y-1">
    <div class="group flex items-center gap-1">
      <Button
        v-if="isActive"
        variant="ghost"
        size="icon"
        class="size-6 shrink-0"
        @click="pagesExpanded = !pagesExpanded"
      >
        <ChevronRightIcon
          class="size-3.5 transition-transform"
          :class="pagesExpanded ? 'rotate-90' : ''"
        />
      </Button>
      <div v-else class="w-6 shrink-0" />

      <SidebarMenuButton
        :is-active="isCollectiveDocumentActive"
        class="flex-1"
        :disabled="openingCollective"
        @click="handleCollectiveClick"
      >
        <FolderOpenIcon class="size-4" />
        <span>{{ collective.emoji ? `${collective.emoji} ` : '' }}{{ collective.name }}</span>
      </SidebarMenuButton>

      <SidebarMenuAction @click="createOpen = true">
        <FilePlus2Icon class="size-4" />
        <span class="sr-only">Seite anlegen</span>
      </SidebarMenuAction>
    </div>

    <CollectiveSidebarPages
      v-if="isActive && pagesExpanded"
      :collective-id="collective.id"
      :active-page-id="activePageId"
    />

    <CreatePageDialog
      v-model:open="createOpen"
      :context-label="collective.name"
      @submit="handleCreate"
    />
  </SidebarMenuItem>
</template>
