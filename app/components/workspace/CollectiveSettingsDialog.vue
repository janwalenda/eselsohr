<script setup lang="ts">
import { ref, watch } from "vue";
import type { CollectiveSummary, UpdateCollectiveInput } from "~~/shared/collectives";
import {
  COLLECTIVE_MEMBER_LEVELS,
  COLLECTIVE_PAGE_MODES,
  validateCollectiveEmoji,
} from "~~/shared/collectives";
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
    collective: CollectiveSummary;
    pending?: boolean;
  }>(),
  {
    pending: false,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: UpdateCollectiveInput];
}>();

const { name, emoji, editLevel, shareLevel, pageMode, toInput } = useCollectiveSettingsForm(
  () => props.collective,
  () => props.open,
);

const emojiError = ref("");

watch([emoji, () => props.open], () => {
  emojiError.value = "";
});

const selectClass =
  "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 disabled:opacity-50";

function close() {
  emit("update:open", false);
}

function handleSubmit() {
  const payload = toInput();

  if (!payload) {
    return;
  }

  const emojiValidation = validateCollectiveEmoji(payload.emoji);

  if (!emojiValidation.valid) {
    emojiError.value = emojiValidation.message;
    return;
  }

  emojiError.value = "";
  emit("submit", payload);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Collective-Einstellungen</DialogTitle>
        <DialogDescription>
          Name, Emoji und Berechtigungen für „{{ collective.name }}“ anpassen.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="collective-settings-name">Name</Label>
          <Input id="collective-settings-name" v-model="name" :disabled="pending" />
        </div>
        <div class="space-y-2">
          <Label for="collective-settings-emoji">Emoji (optional)</Label>
          <Input
            id="collective-settings-emoji"
            v-model="emoji"
            placeholder="🐘"
            :disabled="pending"
            :aria-invalid="Boolean(emojiError)"
          />
          <p v-if="emojiError" class="text-sm text-destructive">{{ emojiError }}</p>
        </div>
        <div class="space-y-2">
          <Label for="collective-settings-edit-level">Bearbeitungsrecht ab</Label>
          <select
            id="collective-settings-edit-level"
            v-model="editLevel"
            :class="selectClass"
            :disabled="pending"
          >
            <option :value="String(COLLECTIVE_MEMBER_LEVELS.member)">Mitglieder</option>
            <option :value="String(COLLECTIVE_MEMBER_LEVELS.moderator)">Moderatoren</option>
            <option :value="String(COLLECTIVE_MEMBER_LEVELS.admin)">Admins</option>
          </select>
        </div>
        <div class="space-y-2">
          <Label for="collective-settings-share-level">Teilen-Recht ab</Label>
          <select
            id="collective-settings-share-level"
            v-model="shareLevel"
            :class="selectClass"
            :disabled="pending"
          >
            <option :value="String(COLLECTIVE_MEMBER_LEVELS.member)">Mitglieder</option>
            <option :value="String(COLLECTIVE_MEMBER_LEVELS.moderator)">Moderatoren</option>
            <option :value="String(COLLECTIVE_MEMBER_LEVELS.admin)">Admins</option>
          </select>
        </div>
        <div class="space-y-2">
          <Label for="collective-settings-page-mode">Seitenmodus</Label>
          <select
            id="collective-settings-page-mode"
            v-model="pageMode"
            :class="selectClass"
            :disabled="pending"
          >
            <option :value="String(COLLECTIVE_PAGE_MODES.edit)">Bearbeiten</option>
            <option :value="String(COLLECTIVE_PAGE_MODES.view)">Ansicht</option>
          </select>
        </div>
      </div>

      <DialogFooter>
        <Button :disabled="pending" @click="close"> Abbrechen </Button>
        <Button :disabled="pending" @click="handleSubmit">
          {{ pending ? "Speichern…" : "Speichern" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
