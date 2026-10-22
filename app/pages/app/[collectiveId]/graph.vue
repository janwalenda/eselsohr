<script setup lang="ts">
import CollectiveGraphView from "@/components/workspace/CollectiveGraphView.vue";

definePageMeta({
  layout: "workspace-graph",
  ssr: false,
});

const route = useRoute();

const collectiveId = computed(() => Number(route.params.collectiveId));
</script>

<template>
  <ClientOnly>
    <div v-if="Number.isFinite(collectiveId)" class="flex min-h-0 flex-1 flex-col">
      <CollectiveGraphView :key="collectiveId" :collective-id="collectiveId" />
    </div>

    <template #fallback>
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="h-14 shrink-0 border-b border-border" />
        <div class="min-h-[24rem] flex-1 p-6">
          <div class="h-full animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </template>
  </ClientOnly>
</template>
