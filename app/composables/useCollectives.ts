import type {
  CollectiveSummary,
  CreateCollectiveInput,
  UpdateCollectiveInput,
} from "~~/shared/collectives";

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

  async function updateCollective(
    collectiveId: number,
    input: UpdateCollectiveInput & { circleId?: string },
  ) {
    const response = await apiFetch<{
      collective: CollectiveSummary;
      warnings?: string[];
    }>(`/api/collectives/${collectiveId}`, {
      method: "PATCH",
      body: input,
    });

    await asyncData.refresh();

    return response;
  }

  async function trashCollective(collectiveId: number) {
    const response = await apiFetch<{ collective: CollectiveSummary }>(
      `/api/collectives/${collectiveId}`,
      {
        method: "DELETE",
      },
    );

    await asyncData.refresh();

    return response.collective;
  }

  return {
    ...asyncData,
    collectives: asyncData.data,
    refresh: asyncData.refresh,
    createCollective,
    updateCollective,
    trashCollective,
  };
}
