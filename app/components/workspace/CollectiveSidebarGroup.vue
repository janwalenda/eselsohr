<script setup lang="ts">
import type { CollectiveSummary } from '~~/shared/collectives'
import { extractApiErrorMessage } from '~~/shared/api-errors'
import { toast } from 'vue-sonner'
import { FilePlus2Icon, FolderOpenIcon } from 'lucide-vue-next'
import CollectiveSidebarPages from '@/components/workspace/CollectiveSidebarPages.vue'
import CreatePageDialog from '@/components/workspace/CreatePageDialog.vue'
import { navigateToCollective } from '@/composables/useCollectiveNavigation'
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

const apiFetch = useApiFetch()
const createOpen = ref(false)
const openingCollective = ref(false)

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

function toMessage(error: unknown) {
  return extractApiErrorMessage(error)
}

async function handleCreate(title: string) {
  try {
    const response = await apiFetch<{ page: { id: number } }>(
      `/api/collectives/${props.collective.id}/pages`,
      {
        method: 'POST',
        body: { title, parentId: 0 },
      },
    )
    toast.success('Seite erstellt')
    await navigateTo(`/app/${props.collective.id}/${response.page.id}`)
  }
  catch (createError) {
    toast.error(toMessage(createError))
  }
}
</script>

<template>
  <SidebarMenuItem class="space-y-1">
    <div class="group flex items-center gap-1">
      <SidebarMenuButton
        :is-active="isActive && !activePageId"
        class="flex-1"
        :disabled="openingCollective"
        @click="openCollective"
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
      v-if="isActive"
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
