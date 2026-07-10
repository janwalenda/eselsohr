export function useApiFetch() {
  return (import.meta.server ? useRequestFetch() : $fetch) as typeof $fetch;
}
