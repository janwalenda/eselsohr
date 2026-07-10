<script setup lang="ts">
import PageEditorPanel from "@/components/workspace/PageEditorPanel.vue";

definePageMeta({
  layout: "workspace",
});

const route = useRoute();

const collectiveId = computed(() => Number(route.params.collectiveId));

const pageId = computed(() => Number(route.params.pageId));
</script>

<template>
  <div class="h-full">
    <PageEditorPanel
      v-if="Number.isFinite(collectiveId) && Number.isFinite(pageId)"
      :key="`${collectiveId}-${pageId}`"
      :collective-id="collectiveId"
      :page-id="pageId"
    />
  </div>
</template>
