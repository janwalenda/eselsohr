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

const props = withDefaults(
  defineProps<{
    open: boolean;
    name?: string;
    pending?: boolean;
  }>(),
  {
    name: "",
    pending: false,
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
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Collective löschen</DialogTitle>
        <DialogDescription>
          „{{ props.name }}“ wird in den Nextcloud-Papierkorb verschoben.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button :disabled="pending" @click="close"> Abbrechen </Button>
        <Button variant="destructive" :disabled="pending" @click="handleSubmit">
          {{ pending ? "Löschen…" : "Löschen" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
