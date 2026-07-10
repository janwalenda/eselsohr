<script setup lang="ts">
import { ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const props = withDefaults(
  defineProps<{
    open: boolean;
    currentTitle?: string;
  }>(),
  {
    currentTitle: "",
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [title: string];
}>();

const title = ref("");

watch(
  () => [props.open, props.currentTitle] as const,
  ([open, currentTitle]) => {
    if (open) {
      title.value = currentTitle;
    }
  },
  { immediate: true },
);

function close() {
  emit("update:open", false);
}

function handleSubmit() {
  const trimmed = title.value.trim();

  if (!trimmed) {
    return;
  }

  emit("submit", trimmed);
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Seite umbenennen</DialogTitle>
        <DialogDescription>
          Passe den sichtbaren Titel und den Markdown-Dateinamen in Collectives an.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <Label for="rename-page-title">Titel</Label>
        <Input
          id="rename-page-title"
          v-model="title"
          placeholder="Seitentitel"
          @keydown.enter.prevent="handleSubmit"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="close"> Abbrechen </Button>
        <Button @click="handleSubmit"> Umbenennen </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
