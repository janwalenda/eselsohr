<script setup lang="ts">
import type {
  CollectivePage,
  CollectivePageNode,
  CreatePageInput,
  UpdatePageInput,
} from "~~/shared/collectives";
import {
  ChevronRightIcon,
  FileTextIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  WaypointsIcon,
} from "lucide-vue-next";
import PageTree from "@/components/workspace/PageTree.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar";

defineProps<{
  page: CollectivePageNode;
  collectiveId: number;
  flatPages: CollectivePageNode[];
  activePageId?: number | null;
  expanded: boolean;
  createPage: (input: CreatePageInput) => Promise<CollectivePage>;
  updatePage: (pageId: number, input: UpdatePageInput) => Promise<CollectivePage>;
  deletePage: (pageId: number) => Promise<CollectivePage>;
}>();

const emit = defineEmits<{
  toggle: [];
  linkClick: [event: MouseEvent];
  create: [];
  rename: [];
  move: [];
  delete: [];
}>();
</script>

<template>
  <SidebarMenuSubItem class="space-y-1">
    <div class="group flex min-w-0 items-center gap-1">
      <Button
        v-if="page.children.length > 0"
        variant="ghost"
        size="icon"
        class="size-6 shrink-0"
        @click="emit('toggle')"
      >
        <ChevronRightIcon
          class="size-3.5 transition-transform"
          :class="expanded ? 'rotate-90' : ''"
        />
      </Button>
      <div v-else class="w-6 shrink-0" />

      <SidebarMenuSubButton as-child :is-active="page.id === activePageId" class="flex-1">
        <NuxtLink :to="`/app/${collectiveId}/${page.id}`" @click="emit('linkClick', $event)">
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
              <DropdownMenuItem @select.prevent="emit('create')">
                <FolderPlusIcon class="size-4" />
                Unterseite
              </DropdownMenuItem>
              <DropdownMenuItem @select.prevent="emit('rename')">
                <PencilIcon class="size-4" />
                Umbenennen
              </DropdownMenuItem>
              <DropdownMenuItem @select.prevent="emit('move')">
                <WaypointsIcon class="size-4" />
                Verschieben
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" @select.prevent="emit('delete')">
                <Trash2Icon class="size-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </NuxtLink>
      </SidebarMenuSubButton>
    </div>

    <PageTree
      v-if="page.children.length > 0 && expanded"
      :collective-id="collectiveId"
      :nodes="page.children"
      :flat-pages="flatPages"
      :active-page-id="activePageId"
      :create-page="createPage"
      :update-page="updatePage"
      :delete-page="deletePage"
    />
  </SidebarMenuSubItem>
</template>
