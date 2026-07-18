import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import type { CollectiveSummary, UpdateCollectiveInput } from "~~/shared/collectives";
import { COLLECTIVE_MEMBER_LEVELS, COLLECTIVE_PAGE_MODES } from "~~/shared/collectives";

export function useCollectiveSettingsForm(
  collective: MaybeRefOrGetter<CollectiveSummary>,
  open: MaybeRefOrGetter<boolean>,
) {
  const name = ref("");

  const emoji = ref("");

  const editLevel = ref(String(COLLECTIVE_MEMBER_LEVELS.member));

  const shareLevel = ref(String(COLLECTIVE_MEMBER_LEVELS.admin));

  const pageMode = ref(String(COLLECTIVE_PAGE_MODES.edit));

  watch(
    () => toValue(open),
    (value) => {
      if (!value) {
        return;
      }

      const current = toValue(collective);

      name.value = current.name;
      emoji.value = current.emoji ?? "";
      editLevel.value = String(current.editPermissionLevel ?? COLLECTIVE_MEMBER_LEVELS.member);
      shareLevel.value = String(current.sharePermissionLevel ?? COLLECTIVE_MEMBER_LEVELS.admin);
      pageMode.value = String(current.pageMode ?? COLLECTIVE_PAGE_MODES.edit);
    },
    { immediate: true },
  );

  function toInput(): UpdateCollectiveInput | null {
    const trimmedName = name.value.trim();

    if (!trimmedName) {
      return null;
    }

    return {
      name: trimmedName,
      emoji: emoji.value.trim() || null,
      editLevel: Number(editLevel.value),
      shareLevel: Number(shareLevel.value),
      pageMode: Number(pageMode.value),
    };
  }

  return {
    name,
    emoji,
    editLevel,
    shareLevel,
    pageMode,
    toInput,
  };
}
