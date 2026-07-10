<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
  }>(),
  {
    title: "",
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [];
}>();

function close() {
  emit("update:open", false);
}

function handleSubmit() {
  emit("submit");
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Seite löschen</DialogTitle>
        <DialogDescription>
          „{{ title }}“ wird in den Nextcloud-Papierkorb verschoben.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" @click="close"> Abbrechen </Button>
        <Button variant="destructive" @click="handleSubmit"> Löschen </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
