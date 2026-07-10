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
    contextLabel?: string;
  }>(),
  {
    contextLabel: "",
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [title: string];
}>();

const title = ref("");

watch(
  () => props.open,
  (value) => {
    if (value) {
      title.value = "";
    }
  },
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
        <DialogTitle>Neue Seite</DialogTitle>
        <DialogDescription>
          Erzeuge eine neue Markdown-Seite
          <span v-if="contextLabel">unter „{{ contextLabel }}“</span>.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <Label for="create-page-title">Titel</Label>
        <Input
          id="create-page-title"
          v-model="title"
          placeholder="Neue Seite"
          @keydown.enter.prevent="handleSubmit"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="close"> Abbrechen </Button>
        <Button @click="handleSubmit"> Erstellen </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
