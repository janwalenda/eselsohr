<script setup lang="ts">
import PageTree from '@/components/workspace/PageTree.vue'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

const props = defineProps<{
  collectiveId: number
  activePageId?: number | null
}>()

const { pages, pending, error, flatPages, createPage, updatePage, deletePage } = useCollectivePages(
  () => props.collectiveId,
)
</script>

<template>
  <SidebarMenuSub v-if="pending">
    <SidebarMenuSubItem>
      <Skeleton class="h-6 w-full" />
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
      <Skeleton class="h-6 w-4/5" />
    </SidebarMenuSubItem>
  </SidebarMenuSub>

  <SidebarMenuSub v-else-if="error">
    <SidebarMenuSubItem class="text-xs text-destructive">
      {{ error.message }}
    </SidebarMenuSubItem>
  </SidebarMenuSub>

  <PageTree
    v-else
    :collective-id="collectiveId"
    :nodes="pages"
    :flat-pages="flatPages"
    :active-page-id="activePageId"
    :create-page="createPage"
    :update-page="updatePage"
    :delete-page="deletePage"
  />
</template>
