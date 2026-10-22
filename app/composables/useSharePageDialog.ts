import type { CollectivePage } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";

export function useSharePageDialog(
  collectiveId: MaybeRefOrGetter<number>,
  page: MaybeRefOrGetter<CollectivePage>,
  emit: (event: "update:open", value: boolean) => void,
) {
  const sharesState = useCollectiveShares(() => toValue(collectiveId));

  const creating = ref(false);

  const deletingToken = ref<string | null>(null);

  const pageShares = computed(() =>
    (sharesState.shares.value ?? []).filter((share) => share.pageId === toValue(page).id),
  );

  function close() {
    emit("update:open", false);
  }

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error("Der Link konnte nicht in die Zwischenablage kopiert werden.");
      throw new Error("clipboard_failed");
    }
  }

  async function handleCreate() {
    creating.value = true;

    try {
      const share = await sharesState.createPageShare(toValue(page).id);

      await copyToClipboard(share.url);
      toast.success("Öffentlicher Link erstellt und kopiert");
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error, "Der öffentliche Link konnte nicht erstellt werden."),
      );
    } finally {
      creating.value = false;
    }
  }

  async function handleCopy(url: string) {
    try {
      await copyToClipboard(url);
      toast.success("Link kopiert");
    } catch {
      // copyToClipboard already shows a toast
    }
  }

  async function handleDelete(token: string) {
    const share = pageShares.value.find((entry) => entry.token === token);

    if (!share) {
      return;
    }

    deletingToken.value = token;

    try {
      await sharesState.deleteShare(share);
      toast.success("Öffentlicher Link gelöscht");
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error, "Der öffentliche Link konnte nicht gelöscht werden."),
      );
    } finally {
      deletingToken.value = null;
    }
  }

  return {
    sharesState,
    creating,
    deletingToken,
    pageShares,
    close,
    handleCreate,
    handleCopy,
    handleDelete,
  };
}
