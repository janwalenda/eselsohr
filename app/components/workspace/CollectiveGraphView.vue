<script setup lang="ts">
import type { GraphMode, GraphNode } from "~~/shared/graph";
import { GitBranchIcon, FolderTreeIcon } from "lucide-vue-next";
import { computed, ref } from "vue";
import { toast } from "vue-sonner";
import AppIcon from "@/components/AppIcon.vue";
import ForceGraphCanvas from "@/components/workspace/ForceGraphCanvas.vue";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectiveGraph } from "@/composables/useCollectiveGraph";
import { useCollectivePages } from "@/composables/useCollectivePages";
import { extractApiErrorMessage } from "~~/shared/api-errors";

const props = defineProps<{
  collectiveId: number;
}>();

const { collectives } = useCollectives();

const collective = computed(
  () => collectives.value.find((entry) => entry.id === props.collectiveId) ?? null,
);

const mode = ref<GraphMode>("links");

const { graphData, pending, error } = useCollectiveGraph(
  () => props.collectiveId,
  () => mode.value,
);

const { landingPage, createPage } = useCollectivePages(() => props.collectiveId);

const graphPayload = computed(() => {
  if (!graphData.value) {
    return null;
  }

  return {
    nodes: graphData.value.nodes,
    links: graphData.value.links,
  };
});

const showEmptyState = computed(
  () => !pending.value && !error.value && graphPayload.value?.nodes.length === 0,
);

async function handleNodeClick(node: GraphNode) {
  if (node.kind === "page") {
    await navigateTo(`/app/${props.collectiveId}/${node.id}`);
    return;
  }

  const landingPageId = landingPage.value?.id;

  if (!landingPageId) {
    toast.error("Die Landing-Page des Collectives konnte nicht gefunden werden.");
    return;
  }

  try {
    const page = await createPage({ title: node.title, parentId: landingPageId });

    toast.success("Seite erstellt");
    await navigateTo(`/app/${props.collectiveId}/${page.id}`);
  } catch (createError) {
    toast.error(extractApiErrorMessage(createError));
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
          <AppIcon
            :icon="collective?.icon"
            :collective-id="collectiveId"
            :owner-page-id="collective?.iconOwnerPageId"
            :fallback-emoji="collective?.emoji"
            fallback-lucide="folder-open"
          />
          <span class="truncate">{{ collective?.name ?? "Collective" }}</span>
        </div>
        <div class="truncate text-xs text-muted-foreground">Graph-Ansicht</div>
      </div>

      <ButtonGroup>
        <Button
          type="button"
          size="sm"
          :variant="mode === 'links' ? 'secondary' : 'outline'"
          :aria-pressed="mode === 'links'"
          @click="mode = 'links'"
        >
          <GitBranchIcon class="size-4" />
          Links
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="mode === 'folder' ? 'secondary' : 'outline'"
          :aria-pressed="mode === 'folder'"
          @click="mode = 'folder'"
        >
          <FolderTreeIcon class="size-4" />
          Ordner
        </Button>
      </ButtonGroup>
    </div>

    <div class="relative min-h-0 flex-1">
      <ClientOnly>
        <ForceGraphCanvas
          v-if="graphPayload && graphPayload.nodes.length > 0"
          :key="`${collectiveId}-${mode}`"
          :graph-data="graphPayload"
          :mode="mode"
          @node-click="handleNodeClick"
        />

        <template #fallback>
          <div class="h-full min-h-[24rem] p-6">
            <Skeleton class="h-full w-full" />
          </div>
        </template>
      </ClientOnly>

      <div
        v-if="pending"
        class="pointer-events-none absolute inset-0 z-10 bg-background/60 p-6 backdrop-blur-[1px]"
      >
        <Skeleton class="h-full w-full" />
      </div>

      <div
        v-if="error"
        class="absolute inset-0 z-20 flex items-center justify-center bg-background p-6 text-sm text-destructive"
      >
        {{ error.message }}
      </div>

      <div
        v-else-if="showEmptyState"
        class="absolute inset-0 z-20 flex items-center justify-center bg-background p-6 text-sm text-muted-foreground"
      >
        Keine Seiten in diesem Collective.
      </div>
    </div>
  </div>
</template>
