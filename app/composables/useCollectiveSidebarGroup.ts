import type { CollectiveSummary } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";
import { navigateToCollective } from "@/composables/useCollectiveNavigation";
import { useCollectivePages } from "@/composables/useCollectivePages";

export function useCollectiveSidebarGroup(
  collective: MaybeRefOrGetter<CollectiveSummary>,
  isActive: MaybeRefOrGetter<boolean>,
  activePageId: MaybeRefOrGetter<number | null | undefined>,
) {
  const createOpen = ref(false);

  const openingCollective = ref(false);

  const pagesExpanded = ref(true);

  const { landingPage, createPage } = useCollectivePages(() =>
    toValue(isActive) ? toValue(collective).id : Number.NaN,
  );

  const landingPageId = computed(() => landingPage.value?.id ?? null);

  const isCollectiveDocumentActive = computed(() => {
    const pageId = toValue(activePageId);

    return toValue(isActive) && (!pageId || pageId === landingPageId.value);
  });

  async function openCollective() {
    if (openingCollective.value) {
      return;
    }

    openingCollective.value = true;

    try {
      await navigateToCollective(toValue(collective).id);
    } finally {
      openingCollective.value = false;
    }
  }

  async function handleCollectiveClick() {
    if (!toValue(isActive)) {
      await openCollective();
      return;
    }

    const pageId = toValue(activePageId);

    const collectiveId = toValue(collective).id;

    if (landingPageId.value && pageId !== landingPageId.value) {
      await navigateTo(`/app/${collectiveId}/${landingPageId.value}`);
      pagesExpanded.value = true;
      return;
    }

    pagesExpanded.value = !pagesExpanded.value;
  }

  watch(
    () => toValue(isActive),
    (active) => {
      if (active) {
        pagesExpanded.value = true;
      }
    },
  );

  async function handleCreate(payload: {
    title: string;
    icon: string | null;
    pendingImage: Blob | null;
  }) {
    try {
      const rootParentId = landingPageId.value;

      if (!rootParentId) {
        throw new Error("Die Landing-Page des Collectives konnte nicht gefunden werden.");
      }

      const apiFetch = useApiFetch();

      const page = await createPage({
        title: payload.title,
        parentId: rootParentId,
        icon: payload.icon,
      });

      if (payload.pendingImage) {
        const { finalizeCreatedPageIcon } = await import("@/lib/page-icons");

        await finalizeCreatedPageIcon(apiFetch, toValue(collective).id, page.id, {
          pendingImage: payload.pendingImage,
        });
      }

      toast.success("Seite erstellt");
      await navigateTo(`/app/${toValue(collective).id}/${page.id}`);
    } catch (createError) {
      toast.error(extractApiErrorMessage(createError));
    }
  }

  return {
    createOpen,
    openingCollective,
    pagesExpanded,
    isCollectiveDocumentActive,
    handleCollectiveClick,
    handleCreate,
  };
}
