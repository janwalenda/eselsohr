<script setup lang="ts">
import type { CollectiveSummary } from "~~/shared/collectives";
import { ChevronRightIcon, FolderOpenIcon, GitBranchIcon } from "lucide-vue-next";
import CollectiveActionsMenu from "@/components/workspace/CollectiveActionsMenu.vue";
import CollectiveSidebarPages from "@/components/workspace/CollectiveSidebarPages.vue";
import CreatePageDialog from "@/components/workspace/CreatePageDialog.vue";
import { useCollectiveSidebarGroup } from "@/composables/useCollectiveSidebarGroup";
import { Button } from "@/components/ui/button";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const props = defineProps<{
  collective: CollectiveSummary;
  activePageId?: number | null;
  isActive: boolean;
  isGraphView?: boolean;
}>();

const {
  createOpen,
  openingCollective,
  pagesExpanded,
  isCollectiveDocumentActive,
  handleCollectiveClick,
  handleCreate,
} = useCollectiveSidebarGroup(
  () => props.collective,
  () => props.isActive,
  () => props.activePageId,
);
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
        <span>{{ collective.emoji ? `${collective.emoji} ` : "" }}{{ collective.name }}</span>
      </SidebarMenuButton>

      <CollectiveActionsMenu :collective="collective" @create="createOpen = true" />
    </div>

    <SidebarMenuSub v-if="isActive">
      <SidebarMenuSubItem>
        <SidebarMenuSubButton as-child :is-active="isGraphView">
          <NuxtLink :to="`/app/${collective.id}/graph`">
            <GitBranchIcon class="size-4" />
            <span>Graph</span>
          </NuxtLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    </SidebarMenuSub>

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
