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
    pending?: boolean;
  }>(),
  {
    pending: false,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: { name: string; icon: string | null; pendingImage: Blob | null }];
}>();

const name = ref("");

const icon = ref<string | null>(null);

const pendingImage = ref<Blob | null>(null);

watch(
  () => props.open,
  (value) => {
    if (value) {
      name.value = "";
      icon.value = null;
      pendingImage.value = null;
    }
  },
);

function close() {
  emit("update:open", false);
}

function handleSubmit() {
  const trimmedName = name.value.trim();

  if (!trimmedName) {
    return;
  }

  const resolvedIcon =
    icon.value?.startsWith("image:pending") && pendingImage.value ? null : icon.value;

  emit("submit", {
    name: trimmedName,
    icon: resolvedIcon,
    pendingImage: pendingImage.value,
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Neues Collective</DialogTitle>
        <DialogDescription>
          Erzeuge ein neues Collective auf deiner Nextcloud-Instanz.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="create-collective-name">Name</Label>
          <Input
            id="create-collective-name"
            v-model="name"
            placeholder="Mein Collective"
            @keydown.enter.prevent="handleSubmit"
          />
        </div>

        <div class="space-y-2">
          <Label>Icon (optional)</Label>
          <IconPicker
            v-model="icon"
            defer-image-upload
            :disabled="pending"
            @pending-image="pendingImage = $event"
          />
        </div>
      </div>

      <DialogFooter>
        <Button :disabled="pending" @click="close"> Abbrechen </Button>
        <Button :disabled="pending" @click="handleSubmit">
          {{ pending ? "Wird erstellt…" : "Erstellen" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
