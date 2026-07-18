import { toast } from "vue-sonner";
import { extractApiErrorMessage } from "~~/shared/api-errors";

function createCollectiveErrorMessage(error: unknown): string {
  const message = extractApiErrorMessage(error);

  if (/team with that name exists/i.test(message)) {
    return "Ein Team mit diesem Namen existiert bereits. Bitte einen anderen Namen wählen (oder das Team in Nextcloud löschen, falls du Admin bist).";
  }

  if (/collective already exists/i.test(message)) {
    return "Ein Collective mit diesem Namen existiert bereits — auch wenn es im Nextcloud-Papierkorb liegt. Bitte einen anderen Namen wählen oder das alte Collective dort endgültig löschen.";
  }

  return message;
}

export function useCreateCollective() {
  const { createCollective } = useCollectives();

  const createOpen = ref(false);

  const creating = ref(false);

  async function handleCreateCollective(payload: { name: string; emoji: string | null }) {
    if (creating.value) {
      return;
    }

    creating.value = true;

    try {
      const collective = await createCollective(payload);

      createOpen.value = false;
      toast.success("Collective erstellt");
      await navigateTo(`/app/${collective.id}`);
    } catch (createError) {
      toast.error(createCollectiveErrorMessage(createError));
    } finally {
      creating.value = false;
    }
  }

  return {
    createOpen,
    creating,
    handleCreateCollective,
  };
}
