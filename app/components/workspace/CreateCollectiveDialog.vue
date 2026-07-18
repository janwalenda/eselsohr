<script setup lang="ts">
import { ref, watch } from "vue";
import { validateCollectiveEmoji } from "~~/shared/collectives";
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
    pending?: boolean;
  }>(),
  {
    pending: false,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: { name: string; emoji: string | null }];
}>();

const name = ref("");

const emoji = ref("");

const emojiError = ref("");

watch(
  () => props.open,
  (value) => {
    if (value) {
      name.value = "";
      emoji.value = "";
      emojiError.value = "";
    }
  },
);

watch(emoji, () => {
  emojiError.value = "";
});

function close() {
  emit("update:open", false);
}

function handleSubmit() {
  const trimmedName = name.value.trim();

  if (!trimmedName) {
    return;
  }

  const trimmedEmoji = emoji.value.trim() || null;

  const emojiValidation = validateCollectiveEmoji(trimmedEmoji);

  if (!emojiValidation.valid) {
    emojiError.value = emojiValidation.message;
    return;
  }

  emojiError.value = "";

  emit("submit", {
    name: trimmedName,
    emoji: trimmedEmoji,
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
          <Label for="create-collective-emoji">Emoji (optional)</Label>
          <Input
            id="create-collective-emoji"
            v-model="emoji"
            placeholder="🐘"
            :aria-invalid="Boolean(emojiError)"
            @keydown.enter.prevent="handleSubmit"
          />
          <p v-if="emojiError" class="text-sm text-destructive">{{ emojiError }}</p>
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
