<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getPageBreadcrumb } from "@/composables/useCollectivePages";
import { isLandingPage, resolveSiblingCreateParentId } from "~~/shared/collectives";
import { toast } from "vue-sonner";
import PageActions from "@/components/workspace/PageActions.vue";
import PageBreadcrumb from "@/components/workspace/PageBreadcrumb.vue";
import PagePropertiesPanel from "@/components/workspace/PagePropertiesPanel.vue";
import TextCollaborativeEditor from "@/components/workspace/TextCollaborativeEditor.vue";
import { usePageProperties } from "@/composables/usePageProperties";

const props = defineProps<{
  collectiveId: number;
  pageId: number;
}>();

const { session } = useNcSession();

const { collectives } = useCollectives();

const {
  pages,
  flatPages,
  error: pagesError,
  createPage,
} = useCollectivePages(() => props.collectiveId);

const pageState = usePage(
  () => props.collectiveId,
  () => props.pageId,
);

await pageState;

const { properties, setProperties } = pageState;

const pageKey = computed(() => `${props.collectiveId}:${props.pageId}`);

const editorRef = ref<InstanceType<typeof TextCollaborativeEditor> | null>(null);

const { definitions, addProperty, updateProperty, removeProperty } = usePageProperties(
  { properties, setProperties },
  pageKey,
  {
    onCommit: () => editorRef.value?.scheduleSave(),
  },
);

const apiFetch = useApiFetch();

const knownTags = ref<string[]>([]);

watch(
  () => [props.collectiveId, props.pageId],
  async () => {
    try {
      const response = await apiFetch<{ tags: string[] }>("/api/search/tags");

      knownTags.value = response.tags;
    } catch {
      knownTags.value = [];
    }
  },
  { immediate: true },
);

const pagePayload = computed(() => pageState.data.value);

const currentCollective = computed(
  () => collectives.value.find((collective) => collective.id === props.collectiveId) ?? null,
);

const currentTrail = computed(() =>
  getPageBreadcrumb(pages.value, props.pageId).filter((page) => !isLandingPage(page)),
);

const displayPage = computed(() => currentTrail.value.at(-1) ?? pagePayload.value?.page ?? null);

const displayTitle = computed(() => {
  const page = pagePayload.value?.page;

  const collective = currentCollective.value;

  if (page && collective && isLandingPage(page)) {
    return collective.emoji ? `${collective.emoji} ${collective.name}` : collective.name;
  }

  return displayPage.value?.title ?? "";
});

const routeErrorMessage = computed(
  () => pagesError.value?.message || pageState.error.value?.message || "",
);

const userName = computed(() => session.value?.loginName ?? "Anonym");

// Bumping this key remounts the editor, which closes the stale Text session and
// opens a fresh one (used to recover from expired sessions / outside changes).
const editorKey = ref(0);

async function reloadEditor() {
  await pageState.reload();
  editorKey.value += 1;
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unbekannter Fehler";
}

async function handleWikiLinkClick(payload: { target: string; resolvedPageId: number | null }) {
  if (payload.resolvedPageId) {
    await navigateTo(`/app/${props.collectiveId}/${payload.resolvedPageId}`);
    return;
  }

  const currentPage = flatPages.value.find((page) => page.id === props.pageId);

  if (!currentPage) {
    return;
  }

  try {
    const page = await createPage({
      title: payload.target,
      parentId: resolveSiblingCreateParentId(currentPage),
    });

    await navigateTo(`/app/${props.collectiveId}/${page.id}`);
  } catch (error) {
    toast.error(toMessage(error));
  }
}
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
            :key="editorKey"
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
