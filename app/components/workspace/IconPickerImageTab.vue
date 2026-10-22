<script setup lang="ts">
import { Label } from "@/components/ui/label";

defineProps<{
  uploading: boolean;
  uploadError: string;
  previewUrl: string | null;
}>();

const emit = defineEmits<{
  fileChange: [event: Event];
}>();
</script>

<template>
  <div class="space-y-3">
    <Label class="text-xs text-muted-foreground">
      Bild wird automatisch auf den Hotspot zugeschnitten (128×128).
    </Label>
    <!-- Native file input: ui/Input always v-models value, which breaks type=file (esp. Firefox). -->
    <input
      type="file"
      accept="image/*"
      :disabled="uploading"
      class="border-input file:text-foreground h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
      @change="emit('fileChange', $event)"
    />
    <img
      v-if="previewUrl"
      :src="previewUrl"
      alt="Vorschau"
      class="size-16 rounded-md object-cover"
    />
    <p v-if="uploadError" class="text-sm text-destructive">{{ uploadError }}</p>
    <p v-if="uploading" class="text-sm text-muted-foreground">Wird verarbeitet…</p>
  </div>
</template>
