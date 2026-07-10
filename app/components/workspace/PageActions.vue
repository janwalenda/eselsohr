<script setup lang="ts">
import type { CollectivePage } from "~~/shared/collectives";
import { resolveCreateParentId } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";
import { MoreHorizontalIcon, PlusIcon } from "lucide-vue-next";
import CreatePageDialog from "@/components/workspace/CreatePageDialog.vue";
import DeletePageDialog from "@/components/workspace/DeletePageDialog.vue";
import MovePageDialog from "@/components/workspace/MovePageDialog.vue";
import RenamePageDialog from "@/components/workspace/RenamePageDialog.vue";
import { Button } from "@/components/ui/button";
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

const { createPage, updatePage, deletePage } = useCollectivePages(() => props.collectiveId);

const createOpen = ref(false);

const renameOpen = ref(false);

const moveOpen = ref(false);

const deleteOpen = ref(false);

const moveOptions = computed(() =>
  props.flatPages
    .filter((candidate) => candidate.id !== props.page.id)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.title,
    })),
);

function toMessage(error: unknown) {
  return extractApiErrorMessage(error);
}

async function handleCreate(title: string) {
  try {
    const page = await createPage({ title, parentId: resolveCreateParentId(props.page) });

    toast.success("Unterseite erstellt");
    await navigateTo(`/app/${props.collectiveId}/${page.id}`);
  } catch (error) {
    toast.error(toMessage(error));
  }
}

async function handleRename(title: string) {
  try {
    await updatePage(props.page.id, { title });
    toast.success("Seite umbenannt");
  } catch (error) {
    toast.error(toMessage(error));
  }
}

async function handleMove(payload: { parentId: number | null; index: number }) {
  try {
    await updatePage(props.page.id, payload);
    toast.success("Seite verschoben");
  } catch (error) {
    toast.error(toMessage(error));
  }
}

async function handleDelete() {
  try {
    await deletePage(props.page.id);
    toast.success("Seite gelöscht");
    await navigateTo(`/app/${props.collectiveId}`);
  } catch (error) {
    toast.error(toMessage(error));
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button variant="outline" size="sm" @click="createOpen = true">
      <PlusIcon class="size-4" />
      Unterseite
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="icon">
          <MoreHorizontalIcon class="size-4" />
          <span class="sr-only">Seitenaktionen</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-52">
        <DropdownMenuItem @select.prevent="createOpen = true">
          Unterseite erstellen
        </DropdownMenuItem>
        <DropdownMenuItem @select.prevent="renameOpen = true"> Umbenennen </DropdownMenuItem>
        <DropdownMenuItem @select.prevent="moveOpen = true"> Verschieben </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" @select.prevent="deleteOpen = true">
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <CreatePageDialog
      v-model:open="createOpen"
      :context-label="page.title"
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
  </div>
</template>
