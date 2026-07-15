import type { CollectivePage } from "~~/shared/collectives";
import { resolveCreateParentId } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";

export function usePageActions(
  collectiveId: MaybeRefOrGetter<number>,
  page: MaybeRefOrGetter<CollectivePage>,
  flatPages: MaybeRefOrGetter<CollectivePage[]>,
) {
  const { createPage, updatePage, deletePage } = useCollectivePages(() => toValue(collectiveId));

  const createOpen = ref(false);

  const renameOpen = ref(false);

  const moveOpen = ref(false);

  const deleteOpen = ref(false);

  const shareOpen = ref(false);

  const moveOptions = computed(() =>
    toValue(flatPages)
      .filter((candidate) => candidate.id !== toValue(page).id)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.title,
      })),
  );

  async function handleCreate(title: string) {
    try {
      const created = await createPage({
        title,
        parentId: resolveCreateParentId(toValue(page)),
      });

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

  return {
    createOpen,
    renameOpen,
    moveOpen,
    deleteOpen,
    shareOpen,
    moveOptions,
    handleCreate,
    handleRename,
    handleMove,
    handleDelete,
  };
}
