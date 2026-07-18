import { ref, toValue, type MaybeRefOrGetter } from "vue";
import type { CollectiveSummary, UpdateCollectiveInput } from "~~/shared/collectives";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { toast } from "vue-sonner";

function collectiveMutationErrorMessage(error: unknown): string {
  const message = extractApiErrorMessage(error);

  if (/team with that name exists/i.test(message)) {
    return "Ein Team mit diesem Namen existiert bereits. Bitte einen anderen Namen wählen.";
  }

  if (/collective already exists/i.test(message)) {
    return "Ein Collective mit diesem Namen existiert bereits.";
  }

  return message;
}

export function useCollectiveActions(collective: MaybeRefOrGetter<CollectiveSummary>) {
  const { updateCollective, trashCollective } = useCollectives();

  const settingsOpen = ref(false);

  const deleteOpen = ref(false);

  const saving = ref(false);

  async function handleSave(input: UpdateCollectiveInput) {
    if (saving.value) {
      return;
    }

    saving.value = true;

    try {
      const current = toValue(collective);

      const response = await updateCollective(current.id, {
        ...input,
        circleId: current.circleId,
      });

      settingsOpen.value = false;

      if (response.warnings?.length) {
        toast.warning(response.warnings[0]);
      } else {
        toast.success("Collective aktualisiert");
      }
    } catch (error) {
      toast.error(collectiveMutationErrorMessage(error));
    } finally {
      saving.value = false;
    }
  }

  async function handleDelete() {
    if (saving.value) {
      return;
    }

    saving.value = true;

    try {
      await trashCollective(toValue(collective).id);

      deleteOpen.value = false;
      toast.success("Collective in den Papierkorb verschoben");
      await navigateTo("/app");
    } catch (error) {
      toast.error(collectiveMutationErrorMessage(error));
    } finally {
      saving.value = false;
    }
  }

  return {
    settingsOpen,
    deleteOpen,
    saving,
    handleSave,
    handleDelete,
  };
}
