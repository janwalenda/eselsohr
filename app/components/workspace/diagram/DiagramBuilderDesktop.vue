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

defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="flex max-h-[90vh] w-[min(96vw,56rem)] max-w-[56rem] flex-col gap-4 overflow-hidden sm:max-w-[56rem]"
    >
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          Visuell erstellen oder Mermaid-Code direkt bearbeiten.
        </DialogDescription>
      </DialogHeader>
      <slot />
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('cancel')">Abbrechen</Button>
        <Button type="button" @click="emit('confirm')">Übernehmen</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
