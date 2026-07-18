import type {
  CollectivePage,
  CollectivePageNode,
  CreatePageInput,
  UpdatePageInput,
} from "~~/shared/collectives";
import { resolveCreateParentId } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";

type PageTreeProps = {
  collectiveId: number;
  flatPages: CollectivePageNode[];
  activePageId?: number | null;
  createPage: (input: CreatePageInput) => Promise<CollectivePage>;
  updatePage: (pageId: number, input: UpdatePageInput) => Promise<CollectivePage>;
  deletePage: (pageId: number) => Promise<CollectivePage>;
};

export function usePageTree(props: PageTreeProps) {
  const collapsedIds = ref<number[]>([]);

  const createTarget = ref<CollectivePageNode | null>(null);

  const renameTarget = ref<CollectivePageNode | null>(null);

  const moveTarget = ref<CollectivePageNode | null>(null);

  const deleteTarget = ref<CollectivePageNode | null>(null);

  function hasActiveDescendant(page: CollectivePageNode): boolean {
    if (page.id === props.activePageId) {
      return true;
    }

    return page.children.some((child) => hasActiveDescendant(child));
  }

  function isExpanded(page: CollectivePageNode) {
    if (hasActiveDescendant(page)) {
      return true;
    }

    return !collapsedIds.value.includes(page.id);
  }

  function togglePage(page: CollectivePageNode) {
    if (hasActiveDescendant(page) && isExpanded(page)) {
      return;
    }

    if (isExpanded(page)) {
      collapsedIds.value = [...collapsedIds.value, page.id];
      return;
    }

    collapsedIds.value = collapsedIds.value.filter((id) => id !== page.id);
  }

  function handlePageLinkClick(page: CollectivePageNode, event: MouseEvent) {
    if (page.children.length === 0) {
      return;
    }

    event.preventDefault();
    togglePage(page);
  }

  const moveOptions = computed(() =>
    props.flatPages.map((page) => ({
      id: page.id,
      label: page.title,
    })),
  );

  async function handleCreate(payload: {
    title: string;
    icon: string | null;
    pendingImage: Blob | null;
  }) {
    if (!createTarget.value) {
      return;
    }

    try {
      const parentId = resolveCreateParentId(createTarget.value);

      const page = await props.createPage({
        title: payload.title,
        parentId,
        icon: payload.icon,
      });

      if (payload.pendingImage) {
        const apiFetch = useApiFetch();

        const { finalizeCreatedPageIcon } = await import("@/lib/page-icons");

        await finalizeCreatedPageIcon(apiFetch, props.collectiveId, page.id, {
          pendingImage: payload.pendingImage,
        });
      }

      toast.success("Unterseite erstellt");
      await navigateTo(`/app/${props.collectiveId}/${page.id}`);
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleRename(title: string) {
    if (!renameTarget.value) {
      return;
    }

    try {
      await props.updatePage(renameTarget.value.id, { title });
      toast.success("Seite umbenannt");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleMove(payload: { parentId: number | null; index: number }) {
    if (!moveTarget.value) {
      return;
    }

    try {
      await props.updatePage(moveTarget.value.id, payload);
      toast.success("Seite verschoben");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!deleteTarget.value) {
      return;
    }

    const deletedPageId = deleteTarget.value.id;

    try {
      await props.deletePage(deletedPageId);
      toast.success("Seite gelöscht");

      if (props.activePageId === deletedPageId) {
        await navigateTo(`/app/${props.collectiveId}`);
      }
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  }

  return {
    createTarget,
    renameTarget,
    moveTarget,
    deleteTarget,
    moveOptions,
    isExpanded,
    togglePage,
    handlePageLinkClick,
    handleCreate,
    handleRename,
    handleMove,
    handleDelete,
  };
}
