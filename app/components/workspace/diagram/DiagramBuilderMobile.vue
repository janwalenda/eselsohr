<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="bottom"
      class="flex h-[95dvh] max-h-[95dvh] flex-col gap-3 overflow-hidden p-4"
    >
      <SheetHeader class="shrink-0 text-left">
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription>
          Visuell erstellen oder Mermaid-Code direkt bearbeiten.
        </SheetDescription>
      </SheetHeader>
      <slot />
      <SheetFooter class="shrink-0 flex-row gap-2">
        <Button type="button" variant="outline" class="flex-1" @click="emit('cancel')">
          Abbrechen
        </Button>
        <Button type="button" class="flex-1" @click="emit('confirm')">Übernehmen</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
