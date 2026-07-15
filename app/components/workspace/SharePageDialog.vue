<script setup lang="ts">
import type { CollectivePage } from "~~/shared/collectives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSharePageDialog } from "@/composables/useSharePageDialog";

const props = defineProps<{
  open: boolean;
  collectiveId: number;
  page: CollectivePage;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const {
  sharesState,
  creating,
  deletingToken,
  pageShares,
  close,
  handleCreate,
  handleCopy,
  handleDelete,
} = useSharePageDialog(
  () => props.collectiveId,
  () => props.page,
  (event, value) => emit(event, value),
);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Öffentlichen Link teilen</DialogTitle>
        <DialogDescription>
          Erzeuge einen öffentlichen Leselink für „{{ page.title }}“ und verwalte bestehende Shares.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div
          v-if="sharesState.pending.value && pageShares.length === 0"
          class="text-sm text-muted-foreground"
        >
          Lade öffentliche Links…
        </div>

        <div
          v-else-if="pageShares.length === 0"
          class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        >
          Für diese Seite gibt es noch keinen öffentlichen Link.
        </div>

        <div v-else class="space-y-3">
          <div v-for="share in pageShares" :key="share.token" class="rounded-lg border p-3">
            <p class="truncate text-sm font-medium">{{ share.url }}</p>
            <p class="mt-1 text-xs text-muted-foreground">Token: {{ share.token }}</p>

            <div class="mt-3 flex flex-wrap gap-2">
              <Button size="sm" @click="handleCopy(share.url)"> Link kopieren </Button>
              <Button
                size="sm"
                variant="destructive"
                :disabled="deletingToken === share.token"
                @click="handleDelete(share.token)"
              >
                Link löschen
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button @click="close"> Schließen </Button>
        <Button :disabled="creating" @click="handleCreate">
          {{ creating ? "Erstelle…" : "Öffentlichen Link erstellen" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
