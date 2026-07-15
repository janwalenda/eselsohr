<script setup lang="ts">
import PageActions from "@/components/workspace/PageActions.vue";
import PageBreadcrumb from "@/components/workspace/PageBreadcrumb.vue";
import PagePropertiesPanel from "@/components/workspace/PagePropertiesPanel.vue";
import TextCollaborativeEditor from "@/components/workspace/TextCollaborativeEditor.vue";
import { usePageEditorPanel } from "@/composables/usePageEditorPanel";

const props = defineProps<{
  collectiveId: number;
  pageId: number;
}>();

const {
  pageState,
  pagesError,
  flatPages,
  properties,
  setProperties,
  definitions,
  addProperty,
  updateProperty,
  removeProperty,
  knownTags,
  pagePayload,
  currentCollective,
  currentTrail,
  displayPage,
  displayTitle,
  routeErrorMessage,
  userName,
  editorKey,
  editorRef,
  reloadEditor,
  handleWikiLinkClick,
} = await usePageEditorPanel(
  () => props.collectiveId,
  () => props.pageId,
);
</script>

<template>
  <div class="h-full">
    <div class="mx-auto flex max-w-5xl flex-col gap-6 px-3 py-3">
      <PageBreadcrumb :collective="currentCollective" :trail="currentTrail" />

      <div v-if="!pagePayload && !pageState.error.value" class="space-y-4">
        <Skeleton class="h-8 w-2/3" />
        <Skeleton class="h-[60vh] w-full rounded-xl" />
      </div>

      <Card
        v-else-if="pagesError || pageState.error.value"
        class="border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      >
        {{ routeErrorMessage }}
      </Card>

      <template v-else-if="pagePayload && displayPage">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-1">
            <h1 class="text-3xl font-semibold tracking-tight">
              {{ displayTitle }}
            </h1>
          </div>

          <PageActions :collective-id="collectiveId" :page="displayPage" :flat-pages="flatPages" />
        </div>

        <PagePropertiesPanel
          :definitions="definitions"
          :known-tags="knownTags"
          @add="addProperty()"
          @update="(index, patch) => updateProperty(index, patch)"
          @remove="(index) => removeProperty(index)"
        />

        <ClientOnly>
          <TextCollaborativeEditor
            ref="editorRef"
            :key="`${pageId}-${editorKey}`"
            :collective-id="collectiveId"
            :page-id="pageId"
            :user-name="userName"
            :properties="properties"
            :pages="flatPages"
            @wiki-link-click="handleWikiLinkClick"
            @update:properties="setProperties"
            @reload="reloadEditor"
          />
          <template #fallback>
            <div class="min-h-[60vh] rounded-xl border bg-background p-4 shadow-sm" />
          </template>
        </ClientOnly>
      </template>

      <div v-else class="text-sm text-muted-foreground">
        Seiteninhalt konnte nicht geladen werden.
      </div>
    </div>
  </div>
</template>
