<script setup lang="ts">
import type {
  CollectivePage,
  CollectivePageNode,
  CreatePageInput,
  UpdatePageInput,
} from '~~/shared/collectives'
import { resolveCreateParentId } from '~~/shared/collectives'
import { extractApiErrorMessage } from '~~/shared/api-errors'
import { toast } from 'vue-sonner'
import {
  ChevronRightIcon,
  FileTextIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  WaypointsIcon,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import CreatePageDialog from '@/components/workspace/CreatePageDialog.vue'
import DeletePageDialog from '@/components/workspace/DeletePageDialog.vue'
import MovePageDialog from '@/components/workspace/MovePageDialog.vue'
import RenamePageDialog from '@/components/workspace/RenamePageDialog.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

defineOptions({
  name: 'PageTree',
})

const props = defineProps<{
  collectiveId: number
  nodes: CollectivePageNode[]
  flatPages: CollectivePageNode[]
  activePageId?: number | null
  createPage: (input: CreatePageInput) => Promise<CollectivePage>
  updatePage: (pageId: number, input: UpdatePageInput) => Promise<CollectivePage>
  deletePage: (pageId: number) => Promise<CollectivePage>
}>()

const { createPage, updatePage, deletePage } = props

const collapsedIds = ref<number[]>([])
const createTarget = ref<CollectivePageNode | null>(null)
const renameTarget = ref<CollectivePageNode | null>(null)
const moveTarget = ref<CollectivePageNode | null>(null)
const deleteTarget = ref<CollectivePageNode | null>(null)

function toMessage(error: unknown) {
  return extractApiErrorMessage(error)
}

function hasActiveDescendant(page: CollectivePageNode): boolean {
  if (page.id === props.activePageId) {
    return true
  }

  return page.children.some(child => hasActiveDescendant(child))
}

function isExpanded(page: CollectivePageNode) {
  if (hasActiveDescendant(page)) {
    return true
  }

  return !collapsedIds.value.includes(page.id)
}

function togglePage(page: CollectivePageNode) {
  if (hasActiveDescendant(page) && isExpanded(page)) {
    return
  }

  if (isExpanded(page)) {
    collapsedIds.value = [...collapsedIds.value, page.id]
    return
  }

  collapsedIds.value = collapsedIds.value.filter(id => id !== page.id)
}

function handlePageLinkClick(page: CollectivePageNode, event: MouseEvent) {
  if (page.children.length === 0) {
    return
  }

  event.preventDefault()
  togglePage(page)
}

const moveOptions = computed(() =>
  props.flatPages.map(page => ({
    id: page.id,
    label: page.title,
  })),
)

async function handleCreate(title: string) {
  if (!createTarget.value) {
    return
  }

  try {
    const page = await createPage({
      title,
      parentId: resolveCreateParentId(createTarget.value),
    })
    toast.success('Unterseite erstellt')
    await navigateTo(`/app/${props.collectiveId}/${page.id}`)
  }
  catch (error) {
    toast.error(toMessage(error))
  }
}

async function handleRename(title: string) {
  if (!renameTarget.value) {
    return
  }

  try {
    await updatePage(renameTarget.value.id, { title })
    toast.success('Seite umbenannt')
  }
  catch (error) {
    toast.error(toMessage(error))
  }
}

async function handleMove(payload: { parentId: number | null, index: number }) {
  if (!moveTarget.value) {
    return
  }

  try {
    await updatePage(moveTarget.value.id, payload)
    toast.success('Seite verschoben')
  }
  catch (error) {
    toast.error(toMessage(error))
  }
}

async function handleDelete() {
  if (!deleteTarget.value) {
    return
  }

  const deletedPageId = deleteTarget.value.id

  try {
    await deletePage(deletedPageId)
    toast.success('Seite gelöscht')

    if (props.activePageId === deletedPageId) {
      await navigateTo(`/app/${props.collectiveId}`)
    }
  }
  catch (error) {
    toast.error(toMessage(error))
  }
}
</script>

<template>
  <SidebarMenuSub v-if="nodes.length > 0">
    <SidebarMenuSubItem
      v-for="page in nodes"
      :key="page.id"
      class="space-y-1"
    >
      <div class="group flex min-w-0 items-center gap-1">
        <Button
          v-if="page.children.length > 0"
          variant="ghost"
          size="icon"
          class="size-6 shrink-0"
          @click="togglePage(page)"
        >
          <ChevronRightIcon
            class="size-3.5 transition-transform"
            :class="isExpanded(page) ? 'rotate-90' : ''"
          />
        </Button>
        <div v-else class="w-6 shrink-0" />

        <SidebarMenuSubButton
          as-child
          :is-active="page.id === activePageId"
          class="flex-1"
        >
          <NuxtLink :to="`/app/${collectiveId}/${page.id}`" @click="handlePageLinkClick(page, $event)">
            <FileTextIcon class="size-4" />
            <span class="min-w-0 flex-1 truncate">{{ page.title }}</span>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-6 shrink-0 opacity-0 transition group-hover:opacity-100"
                  @click.stop
                >
                  <MoreHorizontalIcon class="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuItem @select.prevent="createTarget = page">
                  <FolderPlusIcon class="size-4" />
                  Unterseite
                </DropdownMenuItem>
                <DropdownMenuItem @select.prevent="renameTarget = page">
                  <PencilIcon class="size-4" />
                  Umbenennen
                </DropdownMenuItem>
                <DropdownMenuItem @select.prevent="moveTarget = page">
                  <WaypointsIcon class="size-4" />
                  Verschieben
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" @select.prevent="deleteTarget = page">
                  <Trash2Icon class="size-4" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </NuxtLink>
        </SidebarMenuSubButton>
      </div>

      <PageTree
        v-if="page.children.length > 0 && isExpanded(page)"
        :collective-id="collectiveId"
        :nodes="page.children"
        :flat-pages="flatPages"
        :active-page-id="activePageId"
        :create-page="createPage"
        :update-page="updatePage"
        :delete-page="deletePage"
      />
    </SidebarMenuSubItem>
  </SidebarMenuSub>

  <CreatePageDialog
    :open="Boolean(createTarget)"
    :context-label="createTarget?.title"
    @submit="handleCreate"
    @update:open="!$event && (createTarget = null)"
  />
  <RenamePageDialog
    :open="Boolean(renameTarget)"
    :current-title="renameTarget?.title"
    @submit="handleRename"
    @update:open="!$event && (renameTarget = null)"
  />
  <MovePageDialog
    :open="Boolean(moveTarget)"
    :current-parent-id="moveTarget?.parentId"
    :options="moveOptions"
    @submit="handleMove"
    @update:open="!$event && (moveTarget = null)"
  />
  <DeletePageDialog
    :open="Boolean(deleteTarget)"
    :title="deleteTarget?.title"
    @submit="handleDelete"
    @update:open="!$event && (deleteTarget = null)"
  />
</template>
