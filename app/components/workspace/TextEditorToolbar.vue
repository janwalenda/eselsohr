<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildToolbarActions, type TextEditorCommands } from "@/lib/nc-text/editor/toolbar-actions";

const props = defineProps<{
  editor: Editor;
  isSourceMode: boolean;
  toolbarDisabled: boolean;
  commands: TextEditorCommands;
}>();

const actions = computed(() =>
  buildToolbarActions({
    editor: props.editor,
    isSourceMode: props.isSourceMode,
    toolbarDisabled: props.toolbarDisabled,
    commands: props.commands,
  }),
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-1">
    <template v-for="action in actions" :key="action.key">
      <Separator v-if="action.separatorBefore" orientation="vertical" class="mx-1 h-6" />
      <Button
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': action.isActive?.() }"
        :disabled="action.disabled ?? toolbarDisabled"
        @click="action.action()"
      >
        <component :is="action.icon" v-if="action.icon" class="size-4" />
        <span v-else class="size-4 font-mono text-xs">{{ action.label }}</span>
      </Button>
    </template>
  </div>
</template>
