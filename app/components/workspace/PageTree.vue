<script setup lang="ts">
import type {
  CollectivePage,
  CollectivePageNode,
  CreatePageInput,
  UpdatePageInput,
} from "~~/shared/collectives";
import CreatePageDialog from "@/components/workspace/CreatePageDialog.vue";
import DeletePageDialog from "@/components/workspace/DeletePageDialog.vue";
import MovePageDialog from "@/components/workspace/MovePageDialog.vue";
import RenamePageDialog from "@/components/workspace/RenamePageDialog.vue";
import PageTreeItem from "@/components/workspace/PageTreeItem.vue";
import { usePageTree } from "@/composables/usePageTree";
import { SidebarMenuSub } from "@/components/ui/sidebar";

defineOptions({
  name: "PageTree",
});

const props = defineProps<{
  collectiveId: number;
  nodes: CollectivePageNode[];
  flatPages: CollectivePageNode[];
  activePageId?: number | null;
  createPage: (input: CreatePageInput) => Promise<CollectivePage>;
  updatePage: (pageId: number, input: UpdatePageInput) => Promise<CollectivePage>;
  deletePage: (pageId: number) => Promise<CollectivePage>;
}>();

const {
  createTarget,
  renameTarget,
  moveTarget,
  deleteTarget,
  moveOptions,
  isExpanded,
  togglePage,
  handlePageLinkClick,
  handleCreate,
  handleRename,
  handleMove,
  handleDelete,
} = usePageTree(props);
</script>

<template>
  <SidebarMenuSub v-if="nodes.length > 0">
    <PageTreeItem
      v-for="page in nodes"
      :key="page.id"
      :page="page"
      :collective-id="collectiveId"
      :flat-pages="flatPages"
      :active-page-id="activePageId"
      :expanded="isExpanded(page)"
      :create-page="createPage"
      :update-page="updatePage"
      :delete-page="deletePage"
      @toggle="togglePage(page)"
      @link-click="handlePageLinkClick(page, $event)"
      @create="createTarget = page"
      @rename="renameTarget = page"
      @move="moveTarget = page"
      @delete="deleteTarget = page"
    />
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
