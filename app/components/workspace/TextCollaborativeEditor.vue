<script setup lang="ts">
import EditorViewModeToggle from "@/components/workspace/EditorViewModeToggle.vue";
import TextEditorToolbar from "@/components/workspace/TextEditorToolbar.vue";
import TextEditorNotices from "@/components/workspace/TextEditorNotices.vue";
import TextEditorContent from "@/components/workspace/TextEditorContent.vue";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollaborativeEditor } from "@/composables/useCollaborativeEditor";
import type { PageProperties } from "~~/shared/properties";
import type { CollectivePage } from "~~/shared/collectives";

const props = defineProps<{
  collectiveId: number;
  pageId: number;
  userName: string;
  properties: PageProperties;
  pages?: Pick<CollectivePage, "id" | "title">[];
}>();

const emit = defineEmits<{
  reload: [];
  "update:properties": [properties: PageProperties];
  wikiLinkClick: [payload: { target: string; resolvedPageId: number | null }];
}>();

const {
  session,
  editor,
  viewMode,
  sourceRemoteStale,
  sourceEditorRef,
  onSourceInput,
  lastCollaborator,
  editorStatus,
  statusIconClass,
  toolbarDisabled,
  isSourceMode,
  showFormattingToolbar,
  switchViewMode,
  commands,
  scheduleSave,
} = useCollaborativeEditor({
  collectiveId: () => props.collectiveId,
  pageId: () => props.pageId,
  userName: () => props.userName,
  properties: () => props.properties,
  pages: () => props.pages,
  emit,
});

defineExpose({
  session,
  scheduleSave,
});
</script>

<template>
  <div class="nc-text-editor flex h-full flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <TextEditorToolbar
        v-if="editor && showFormattingToolbar && !toolbarDisabled"
        :editor="editor"
        :is-source-mode="isSourceMode"
        :toolbar-disabled="toolbarDisabled"
        :commands="commands"
      />

      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span v-if="lastCollaborator" class="truncate">
          {{ lastCollaborator }}
        </span>
        <Tooltip>
          <TooltipTrigger as-child>
            <span
              class="inline-flex size-7 items-center justify-center rounded-md"
              :aria-label="editorStatus.label"
            >
              <component
                :is="editorStatus.icon"
                class="size-4"
                :class="[statusIconClass, editorStatus.spin && 'animate-spin']"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ editorStatus.label }}</TooltipContent>
        </Tooltip>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <EditorViewModeToggle :model-value="viewMode" @update:model-value="switchViewMode" />
      </div>
    </div>

    <TextEditorNotices
      :source-remote-stale="sourceRemoteStale"
      :has-conflict="Boolean(session.conflictContent.value)"
      :expired="session.expired.value"
      @reload="emit('reload')"
    />

    <TextEditorContent
      :view-mode="viewMode"
      :editor="editor"
      :toolbar-disabled="toolbarDisabled"
      :source-editor-ref="sourceEditorRef"
      @update:source-editor-ref="sourceEditorRef = $event"
      @source-input="onSourceInput"
    />
  </div>
</template>
