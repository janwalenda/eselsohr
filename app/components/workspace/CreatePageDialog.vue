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
import IconPicker from "@/components/workspace/IconPicker.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    contextLabel?: string;
    collectiveId?: number | null;
  }>(),
  {
    contextLabel: "",
    collectiveId: null,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: { title: string; icon: string | null; pendingImage: Blob | null }];
}>();

const title = ref("");

const icon = ref<string | null>(null);

const pendingImage = ref<Blob | null>(null);

watch(
  () => props.open,
  (value) => {
    if (value) {
      title.value = "";
      icon.value = null;
      pendingImage.value = null;
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

  const resolvedIcon =
    icon.value?.startsWith("image:pending") && pendingImage.value ? null : icon.value;

  emit("submit", {
    title: trimmed,
    icon: resolvedIcon,
    pendingImage: pendingImage.value,
  });
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

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="create-page-title">Titel</Label>
          <Input
            id="create-page-title"
            v-model="title"
            placeholder="Neue Seite"
            @keydown.enter.prevent="handleSubmit"
          />
        </div>

        <div class="space-y-2">
          <Label>Icon (optional)</Label>
          <IconPicker
            v-model="icon"
            :collective-id="collectiveId"
            defer-image-upload
            @pending-image="pendingImage = $event"
          />
        </div>
      </div>

      <DialogFooter>
        <Button @click="close"> Abbrechen </Button>
        <Button @click="handleSubmit"> Erstellen </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
