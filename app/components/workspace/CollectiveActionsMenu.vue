<script setup lang="ts">
import type { CollectiveSummary } from "~~/shared/collectives";
import { FilePlus2Icon, MoreHorizontalIcon } from "lucide-vue-next";
import CollectiveSettingsDialog from "@/components/workspace/CollectiveSettingsDialog.vue";
import DeleteCollectiveDialog from "@/components/workspace/DeleteCollectiveDialog.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const props = defineProps<{
  collective: CollectiveSummary;
}>();

const emit = defineEmits<{
  create: [];
}>();

const { settingsOpen, deleteOpen, saving, handleSave, handleDelete } = useCollectiveActions(
  () => props.collective,
);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-6 shrink-0 opacity-0 transition group-hover:opacity-100"
        @click.stop
      >
        <MoreHorizontalIcon class="size-3.5" />
        <span class="sr-only">Collective-Aktionen</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuItem @select.prevent="emit('create')">
        <FilePlus2Icon class="size-4" />
        Seite anlegen
      </DropdownMenuItem>
      <template v-if="collective.canEdit">
        <DropdownMenuSeparator />
        <DropdownMenuItem @select.prevent="settingsOpen = true">Einstellungen</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" @select.prevent="deleteOpen = true">
          Löschen
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>

  <CollectiveSettingsDialog
    v-if="collective.canEdit"
    v-model:open="settingsOpen"
    :collective="collective"
    :pending="saving"
    @submit="handleSave"
  />
  <DeleteCollectiveDialog
    v-if="collective.canEdit"
    v-model:open="deleteOpen"
    :name="collective.name"
    :pending="saving"
    @submit="handleDelete"
  />
</template>
