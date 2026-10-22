<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import CollectiveSidebarGroup from "@/components/workspace/CollectiveSidebarGroup.vue";
import CreateCollectiveDialog from "@/components/workspace/CreateCollectiveDialog.vue";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const route = useRoute();

const { collectives, pending, error } = useCollectives();

const { createOpen, creating, handleCreateCollective } = useCreateCollective();

const currentCollectiveId = computed(() => Number(route.params.collectiveId));

const activePageId = computed(() => {
  const pageId = Number(route.params.pageId);

  return Number.isFinite(pageId) ? pageId : null;
});

const isGraphView = computed(() => {
  if (!Number.isFinite(currentCollectiveId.value)) {
    return false;
  }

  return /^\/app\/\d+\/graph\/?$/.test(route.path);
});
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Collectives</SidebarGroupLabel>
    <SidebarGroupAction as="button" title="Collective anlegen" @click="createOpen = true">
      <PlusIcon class="size-4" />
      <span class="sr-only">Collective anlegen</span>
    </SidebarGroupAction>
    <SidebarGroupContent>
      <SidebarMenu v-if="pending">
        <SidebarMenuItem>
          <Skeleton class="h-8 w-full" />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <Skeleton class="h-8 w-5/6" />
        </SidebarMenuItem>
      </SidebarMenu>

      <div v-else-if="error" class="px-2 text-sm text-destructive">
        {{ error.message }}
      </div>

      <SidebarMenu v-else>
        <CollectiveSidebarGroup
          v-for="collective in collectives"
          :key="collective.id"
          :collective="collective"
          :is-active="currentCollectiveId === collective.id"
          :active-page-id="currentCollectiveId === collective.id ? activePageId : null"
          :is-graph-view="currentCollectiveId === collective.id && isGraphView"
        />
      </SidebarMenu>
    </SidebarGroupContent>

    <CreateCollectiveDialog
      v-model:open="createOpen"
      :pending="creating"
      @submit="handleCreateCollective"
    />
  </SidebarGroup>
</template>
