import type { CollectivePage, PageContentPayload } from "~~/shared/collectives";
import { useDebounceFn } from "@vueuse/core";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

export function usePage(
  collectiveIdSource: MaybeRefOrGetter<number | string>,
  pageIdSource: MaybeRefOrGetter<number | string>,
) {
  const apiFetch = useApiFetch();

  const collectiveId = computed(() => Number(toValue(collectiveIdSource)));

  const pageId = computed(() => Number(toValue(pageIdSource)));

  const key = computed(() => `collective-page:${collectiveId.value}:${pageId.value}`);

  const content = ref("");

  const etag = ref<string | null>(null);

  const saving = ref(false);

  const dirty = ref(false);

  const saveError = ref<unknown>(null);

  const hydrated = ref(false);

  const asyncData = useAsyncData(
    () => key.value,
    async () => {
      if (!Number.isFinite(collectiveId.value) || !Number.isFinite(pageId.value)) {
        return null;
      }

      const payload = await apiFetch<PageContentPayload>(
        `/api/collectives/${collectiveId.value}/pages/${pageId.value}/content`,
      );

      return payload;
    },
    {
      watch: [collectiveId, pageId],
      default: () => null,
    },
  );

  watch(
    asyncData.data,
    (payload) => {
      hydrated.value = false;
      content.value = payload?.content ?? "";
      etag.value = payload?.etag ?? null;
      saveError.value = null;
      dirty.value = false;
      hydrated.value = true;
    },
    { immediate: true },
  );

  async function save(nextContent = content.value) {
    if (!Number.isFinite(collectiveId.value) || !Number.isFinite(pageId.value)) {
      return null;
    }

    saving.value = true;
    saveError.value = null;

    try {
      const response = await apiFetch<{ page: CollectivePage; etag: string | null }>(
        `/api/collectives/${collectiveId.value}/pages/${pageId.value}/content`,
        {
          method: "PUT",
          body: {
            content: nextContent,
            etag: etag.value,
          },
        },
      );

      content.value = nextContent;
      etag.value = response.etag;
      dirty.value = false;
      return response;
    } catch (error) {
      saveError.value = error;
      throw error;
    } finally {
      saving.value = false;
    }
  }

  const debouncedSave = useDebounceFn(async () => {
    if (!dirty.value || saving.value) {
      return;
    }

    await save(content.value);
  }, 1500);

  function setContent(nextContent: string) {
    content.value = nextContent;

    if (!hydrated.value) {
      return;
    }

    dirty.value = true;
    void debouncedSave();
  }

  async function reload() {
    const payload = await asyncData.refresh();

    return payload;
  }

  return {
    ...asyncData,
    page: computed(() => asyncData.data.value?.page ?? null),
    content,
    etag,
    saving,
    dirty,
    saveError,
    setContent,
    save,
    reload,
  };
}
