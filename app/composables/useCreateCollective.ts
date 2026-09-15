import { toast } from "vue-sonner";
import { extractApiErrorMessage } from "~~/shared/api-errors";
import { serializeIcon } from "~~/shared/icons";

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

  const apiFetch = useApiFetch();

  const createOpen = ref(false);

  const creating = ref(false);

  async function handleCreateCollective(payload: {
    name: string;
    icon: string | null;
    pendingImage: Blob | null;
  }) {
    if (creating.value) {
      return;
    }

    creating.value = true;

    try {
      const collective = await createCollective({
        name: payload.name,
        icon: payload.icon,
      });

      if (payload.pendingImage && collective.iconOwnerPageId == null) {
        // Resolve landing page for image upload after create.
        try {
          const pagesResponse = await apiFetch<{
            pages: { id: number; fileName: string; filePath: string; parentId: number }[];
          }>(`/api/collectives/${collective.id}/pages`);

          const { flattenPageTree, findLandingPage } = await import("~~/shared/collectives");

          const landing = findLandingPage(flattenPageTree(pagesResponse.pages));

          if (landing) {
            const form = new FormData();

            form.append(
              "file",
              new File([payload.pendingImage], `icon-${Date.now()}.webp`, {
                type: "image/webp",
              }),
            );

            const uploaded = await apiFetch<{ path: string }>(
              `/api/collectives/${collective.id}/pages/${landing.id}/attachments`,
              { method: "POST", body: form },
            );

            await apiFetch(`/api/collectives/${collective.id}/icon`, {
              method: "PUT",
              body: { icon: serializeIcon({ kind: "image", value: uploaded.path }) },
            });
          }
        } catch (error) {
          console.error("[icons] post-create image icon failed:", error);
          toast.warning("Collective erstellt, aber Icon-Bild konnte nicht gespeichert werden");
        }
      }

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
