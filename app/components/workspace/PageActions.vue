<script setup lang="ts">
import type { CollectivePage } from "~~/shared/collectives";
import { MoreHorizontalIcon, PlusIcon } from "lucide-vue-next";
import CreatePageDialog from "@/components/workspace/CreatePageDialog.vue";
import DeletePageDialog from "@/components/workspace/DeletePageDialog.vue";
import IconPicker from "@/components/workspace/IconPicker.vue";
import MovePageDialog from "@/components/workspace/MovePageDialog.vue";
import RenamePageDialog from "@/components/workspace/RenamePageDialog.vue";
import SharePageDialog from "@/components/workspace/SharePageDialog.vue";
import { usePageActions } from "@/composables/usePageActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const props = defineProps<{
  collectiveId: number;
  page: CollectivePage;
  flatPages: CollectivePage[];
}>();

const {
  createOpen,
  renameOpen,
  moveOpen,
  deleteOpen,
  shareOpen,
  iconOpen,
  pageIcon,
  moveOptions,
  handleCreate,
  handleRename,
  handleMove,
  handleDelete,
  handleSaveIcon,
} = usePageActions(
  () => props.collectiveId,
  () => props.page,
  () => props.flatPages,
);
</script>

<template>
  <div class="flex items-center gap-2">
    <Button size="sm" @click="createOpen = true">
      <PlusIcon class="size-4" />
      Unterseite
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button size="icon">
          <MoreHorizontalIcon class="size-4" />
          <span class="sr-only">Seitenaktionen</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-52">
        <DropdownMenuItem @select.prevent="createOpen = true">
          Unterseite erstellen
        </DropdownMenuItem>
        <DropdownMenuItem @select.prevent="iconOpen = true"> Icon ändern </DropdownMenuItem>
        <DropdownMenuItem @select.prevent="renameOpen = true"> Umbenennen </DropdownMenuItem>
        <DropdownMenuItem @select.prevent="moveOpen = true"> Verschieben </DropdownMenuItem>
        <DropdownMenuItem @select.prevent="shareOpen = true"> Öffentlich teilen </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select.prevent="deleteOpen = true">
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <CreatePageDialog
      v-model:open="createOpen"
      :context-label="page.title"
      :collective-id="collectiveId"
      @submit="handleCreate"
    />
    <RenamePageDialog
      v-model:open="renameOpen"
      :current-title="page.title"
      @submit="handleRename"
    />
    <MovePageDialog
      v-model:open="moveOpen"
      :current-parent-id="page.parentId"
      :options="moveOptions"
      @submit="handleMove"
    />
    <DeletePageDialog v-model:open="deleteOpen" :title="page.title" @submit="handleDelete" />
    <SharePageDialog v-model:open="shareOpen" :collective-id="collectiveId" :page="page" />

    <Dialog v-model:open="iconOpen">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Seiten-Icon</DialogTitle>
        </DialogHeader>
        <IconPicker v-model="pageIcon" :collective-id="collectiveId" :owner-page-id="page.id" />
        <DialogFooter>
          <Button @click="handleSaveIcon(pageIcon)"> Speichern </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
