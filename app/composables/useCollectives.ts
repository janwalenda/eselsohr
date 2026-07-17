import type { CollectiveSummary, CreateCollectiveInput } from "~~/shared/collectives";

export function useCollectives() {
  const apiFetch = useApiFetch();

  const asyncData = useAsyncData(
    "collectives",
    async () => {
      const response = await apiFetch<{ collectives: CollectiveSummary[] }>("/api/collectives");

      return response.collectives;
    },
    {
      default: () => [],
    },
  );

  async function createCollective(input: CreateCollectiveInput) {
    const response = await apiFetch<{ collective: CollectiveSummary }>("/api/collectives", {
      method: "POST",
      body: input,
    });

    await asyncData.refresh();

    return response.collective;
  }

  return {
    ...asyncData,
    collectives: asyncData.data,
    refresh: asyncData.refresh,
    createCollective,
  };
}
