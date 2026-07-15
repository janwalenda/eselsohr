<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

type ParentOption = {
  id: number;
  label: string;
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    currentParentId?: number | null;
    currentIndex?: number | null;
    options: ParentOption[];
  }>(),
  {
    currentParentId: null,
    currentIndex: 0,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: { parentId: number | null; index: number }];
}>();

const parentId = ref<string>("root");

const index = ref(0);

watch(
  () => [props.open, props.currentParentId, props.currentIndex] as const,
  ([open, currentParentId, currentIndex]) => {
    if (open) {
      parentId.value = currentParentId == null ? "root" : String(currentParentId);
      index.value = currentIndex ?? 0;
    }
  },
  { immediate: true },
);

const normalizedOptions = computed(() => [
  { id: "root", label: "Am Anfang des Collectives" },
  ...props.options.map((option) => ({
    id: String(option.id),
    label: option.label,
  })),
]);

function close() {
  emit("update:open", false);
}

function handleSubmit() {
  emit("submit", {
    parentId: parentId.value === "root" ? null : Number(parentId.value),
    index: Math.max(0, Number(index.value) || 0),
  });
  close();
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Seite verschieben</DialogTitle>
        <DialogDescription>
          Wähle eine neue Elternseite und optional die Zielposition in deren Unterseitenliste.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="move-page-parent">Neue Elternseite</Label>
          <select
            id="move-page-parent"
            v-model="parentId"
            class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-hidden focus-visible:ring-2"
          >
            <option v-for="option in normalizedOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="move-page-index">Position</Label>
          <Input id="move-page-index" v-model.number="index" type="number" min="0" />
        </div>
      </div>

      <DialogFooter>
        <Button @click="close"> Abbrechen </Button>
        <Button @click="handleSubmit"> Verschieben </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
