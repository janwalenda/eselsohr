<script setup lang="ts">
import type { CollectivePage } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const props = defineProps<{
  open: boolean;
  collectiveId: number;
  page: CollectivePage;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const sharesState = useCollectiveShares(() => props.collectiveId);

const creating = ref(false);

const deletingToken = ref<string | null>(null);

const pageShares = computed(() =>
  (sharesState.shares.value ?? []).filter((share) => share.pageId === props.page.id),
);

function close() {
  emit("update:open", false);
}

async function handleCreate() {
  creating.value = true;

  try {
    const share = await sharesState.createPageShare(props.page.id);

    await copyToClipboard(share.url);
    toast.success("Öffentlicher Link erstellt und kopiert");
  } catch (error) {
    toast.error(
      extractApiErrorMessage(error, "Der öffentliche Link konnte nicht erstellt werden."),
    );
  } finally {
    creating.value = false;
  }
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    toast.error("Der Link konnte nicht in die Zwischenablage kopiert werden.");
    throw new Error("clipboard_failed");
  }
}

async function handleCopy(url: string) {
  try {
    await copyToClipboard(url);
    toast.success("Link kopiert");
  } catch {
    // copyToClipboard already shows a toast
  }
}

async function handleDelete(token: string) {
  const share = pageShares.value.find((entry) => entry.token === token);

  if (!share) {
    return;
  }

  deletingToken.value = token;

  try {
    await sharesState.deleteShare(share);
    toast.success("Öffentlicher Link gelöscht");
  } catch (error) {
    toast.error(
      extractApiErrorMessage(error, "Der öffentliche Link konnte nicht gelöscht werden."),
    );
  } finally {
    deletingToken.value = null;
  }
}
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
              <Button size="sm" variant="outline" @click="handleCopy(share.url)">
                Link kopieren
              </Button>
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
        <Button variant="outline" @click="close"> Schließen </Button>
        <Button :disabled="creating" @click="handleCreate">
          {{ creating ? "Erstelle…" : "Öffentlichen Link erstellen" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
