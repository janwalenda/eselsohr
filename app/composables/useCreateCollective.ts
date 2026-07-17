import { toast } from "vue-sonner";
import { extractApiErrorMessage } from "~~/shared/api-errors";

export function useCreateCollective() {
  const { createCollective } = useCollectives();

  const createOpen = ref(false);

  async function handleCreateCollective(payload: { name: string; emoji: string | null }) {
    try {
      const collective = await createCollective(payload);

      toast.success("Collective erstellt");
      await navigateTo(`/app/${collective.id}`);
    } catch (createError) {
      toast.error(extractApiErrorMessage(createError));
    }
  }

  return {
    createOpen,
    handleCreateCollective,
  };
}
