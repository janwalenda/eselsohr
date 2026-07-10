<script setup lang="ts">
import { computed, ref } from "vue";
import { getPageBreadcrumb } from "@/composables/useCollectivePages";
import { isLandingPage } from "~~/shared/collectives";
import PageActions from "@/components/workspace/PageActions.vue";
import PageBreadcrumb from "@/components/workspace/PageBreadcrumb.vue";
import TextCollaborativeEditor from "@/components/workspace/TextCollaborativeEditor.vue";

const props = defineProps<{
  collectiveId: number;
  pageId: number;
}>();

const { session } = useNcSession();

const { collectives } = useCollectives();

const { pages, flatPages, error: pagesError } = useCollectivePages(() => props.collectiveId);

const pageState = usePage(
  () => props.collectiveId,
  () => props.pageId,
);

await pageState;

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

        <ClientOnly>
          <TextCollaborativeEditor
            :key="editorKey"
            :collective-id="collectiveId"
            :page-id="pageId"
            :user-name="userName"
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
