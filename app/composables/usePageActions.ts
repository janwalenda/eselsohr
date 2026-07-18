import type { CollectivePage } from "~~/shared/collectives";
import { resolveCreateParentId } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";
import { finalizeCreatedPageIcon } from "@/lib/page-icons";

export function usePageActions(
  collectiveId: MaybeRefOrGetter<number>,
  page: MaybeRefOrGetter<CollectivePage>,
  flatPages: MaybeRefOrGetter<CollectivePage[]>,
) {
  const apiFetch = useApiFetch();

  const { createPage, updatePage, deletePage, refreshPages } = useCollectivePages(() =>
    toValue(collectiveId),
  );

  const createOpen = ref(false);

  const renameOpen = ref(false);

  const moveOpen = ref(false);

  const deleteOpen = ref(false);

  const shareOpen = ref(false);

  const iconOpen = ref(false);

  const pageIcon = ref<string | null>(null);

  const moveOptions = computed(() =>
    toValue(flatPages)
      .filter((candidate) => candidate.id !== toValue(page).id)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.title,
      })),
  );

  watch(
    () => toValue(page).icon,
    (value) => {
      pageIcon.value = value ?? null;
    },
    { immediate: true },
  );

  async function handleCreate(payload: {
    title: string;
    icon: string | null;
    pendingImage: Blob | null;
  }) {
    try {
      const created = await createPage({
        title: payload.title,
        parentId: resolveCreateParentId(toValue(page)),
        icon: payload.icon,
      });

      if (payload.pendingImage) {
        await finalizeCreatedPageIcon(apiFetch, toValue(collectiveId), created.id, {
          pendingImage: payload.pendingImage,
        });
        await refreshPages();
      }

      toast.success("Unterseite erstellt");
      await navigateTo(`/app/${toValue(collectiveId)}/${created.id}`);
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleRename(title: string) {
    try {
      await updatePage(toValue(page).id, { title });
      toast.success("Seite umbenannt");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleMove(payload: { parentId: number | null; index: number }) {
    try {
      await updatePage(toValue(page).id, payload);
      toast.success("Seite verschoben");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    try {
      await deletePage(toValue(page).id);
      toast.success("Seite gelöscht");
      await navigateTo(`/app/${toValue(collectiveId)}`);
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleSaveIcon(icon: string | null) {
    try {
      await apiFetch(`/api/collectives/${toValue(collectiveId)}/pages/${toValue(page).id}/icon`, {
        method: "PUT",
        body: { icon },
      });
      await refreshPages();
      toast.success("Icon gespeichert");
      iconOpen.value = false;
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  return {
    createOpen,
    renameOpen,
    moveOpen,
    deleteOpen,
    shareOpen,
    iconOpen,
    pageIcon,
    moveOptions,
    handleCreate,
    handleRename,
    handleMove,
    handleDelete,
    handleSaveIcon,
  };
}
