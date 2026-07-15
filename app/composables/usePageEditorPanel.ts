import type { ComponentPublicInstance } from "vue";
import { getPageBreadcrumb } from "@/composables/useCollectivePages";
import { isLandingPage, resolveSiblingCreateParentId } from "~~/shared/collectives";
import { toast } from "vue-sonner";
import { usePageProperties } from "@/composables/usePageProperties";

type EditorExpose = {
  scheduleSave: () => void;
};

export async function usePageEditorPanel(
  collectiveId: MaybeRefOrGetter<number>,
  pageId: MaybeRefOrGetter<number>,
) {
  const { session } = useNcSession();

  const { collectives } = useCollectives();

  const {
    pages,
    flatPages,
    error: pagesError,
    createPage,
  } = useCollectivePages(() => toValue(collectiveId));

  const pageState = usePage(
    () => toValue(collectiveId),
    () => toValue(pageId),
  );

  await pageState;

  const { properties, setProperties } = pageState;

  const pageKey = computed(() => `${toValue(collectiveId)}:${toValue(pageId)}`);

  const editorRef = ref<(ComponentPublicInstance & EditorExpose) | null>(null);

  const { definitions, addProperty, updateProperty, removeProperty } = usePageProperties(
    { properties, setProperties },
    pageKey,
    { onCommit: () => editorRef.value?.scheduleSave() },
  );

  const apiFetch = useApiFetch();

  const { data: knownTags } = await useAsyncData(
    "known-tags",
    () =>
      apiFetch<{ tags: string[] }>("/api/search/tags")
        .then((response) => response.tags)
        .catch(() => [] as string[]),
    { default: () => [] as string[] },
  );

  const pagePayload = computed(() => pageState.data.value);

  const currentCollective = computed(
    () => collectives.value.find((c) => c.id === toValue(collectiveId)) ?? null,
  );

  const currentTrail = computed(() =>
    getPageBreadcrumb(pages.value, toValue(pageId)).filter((page) => !isLandingPage(page)),
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

  const editorKey = ref(0);

  async function reloadEditor() {
    await pageState.reload();
    editorKey.value += 1;
  }

  async function handleWikiLinkClick(payload: { target: string; resolvedPageId: number | null }) {
    if (payload.resolvedPageId) {
      await navigateTo(`/app/${toValue(collectiveId)}/${payload.resolvedPageId}`);
      return;
    }

    const currentPage = flatPages.value.find((page) => page.id === toValue(pageId));

    if (!currentPage) {
      return;
    }

    try {
      const page = await createPage({
        title: payload.target,
        parentId: resolveSiblingCreateParentId(currentPage),
      });

      await navigateTo(`/app/${toValue(collectiveId)}/${page.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unbekannter Fehler");
    }
  }

  return {
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
  };
}
