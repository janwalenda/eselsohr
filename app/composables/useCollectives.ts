import type { CollectiveSummary } from '~~/shared/collectives'

export function useCollectives() {
  const apiFetch = useApiFetch()

  const asyncData = useAsyncData(
    'collectives',
    async () => {
      const response = await apiFetch<{ collectives: CollectiveSummary[] }>('/api/collectives')
      return response.collectives
    },
    {
      default: () => [],
    },
  )

  return {
    ...asyncData,
    collectives: asyncData.data,
  }
}
