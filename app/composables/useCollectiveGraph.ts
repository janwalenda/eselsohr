import type { GraphData, GraphMode } from "~~/shared/graph";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

export type CollectiveGraphPayload = GraphData & {
  mode: GraphMode;
};

export function useCollectiveGraph(
  collectiveIdSource: MaybeRefOrGetter<number | string>,
  modeSource: MaybeRefOrGetter<GraphMode>,
) {
  const apiFetch = useApiFetch();

  const collectiveId = computed(() => Number(toValue(collectiveIdSource)));

  const mode = computed(() => toValue(modeSource));

  const key = computed(() => `collective-graph:${collectiveId.value}:${mode.value}`);

  const asyncData = useAsyncData(
    () => key.value,
    async () => {
      if (!Number.isFinite(collectiveId.value)) {
        return null;
      }

      return apiFetch<CollectiveGraphPayload>(
        `/api/collectives/${collectiveId.value}/graph?mode=${mode.value}`,
      );
    },
    {
      watch: [collectiveId, mode],
      default: () => null,
    },
  );

  return {
    ...asyncData,
    graphData: asyncData.data,
  };
}
