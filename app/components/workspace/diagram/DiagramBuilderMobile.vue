<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
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
      class="flex h-dvh max-h-dvh flex-col gap-2 overflow-hidden p-3 pt-4"
    >
      <SheetHeader class="shrink-0 space-y-0 pr-8 text-left">
        <SheetTitle>{{ title }}</SheetTitle>
      </SheetHeader>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <slot />
      </div>
      <SheetFooter class="shrink-0 flex-row gap-2 border-t pt-2">
        <Button type="button" variant="outline" class="flex-1" @click="emit('cancel')">
          Abbrechen
        </Button>
        <Button type="button" class="flex-1" @click="emit('confirm')">Übernehmen</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
