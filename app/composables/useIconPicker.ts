import { computed, nextTick, ref, watch, type Component } from "vue";
import { LUCIDE_PICKER_NAMES, loadLucideIcon } from "@/lib/lucide";
import { autoCropSquareIcon } from "@/lib/icon-crop";
import { parseIcon, serializeIcon } from "~~/shared/icons";

export const COMMON_ICON_EMOJIS = [
  "🐘",
  "📁",
  "📝",
  "💡",
  "🚀",
  "⭐",
  "🔥",
  "❤️",
  "🎯",
  "🏠",
  "📚",
  "🔧",
  "🎨",
  "🧪",
  "📊",
  "🌱",
  "🇩🇪",
  "1️⃣",
  "✅",
  "🎉",
];

export type IconPickerTab = "emoji" | "lucide" | "image";

export function useIconPicker(options: {
  modelValue: () => string | null | undefined;
  collectiveId: () => number | null | undefined;
  ownerPageId: () => number | null | undefined;
  deferImageUpload: () => boolean;
  emit: {
    (event: "update:modelValue", value: string | null): void;
    (event: "pendingImage", value: Blob | null): void;
  };
  close: () => void;
}) {
  const apiFetch = useApiFetch();

  const tab = ref<IconPickerTab>("emoji");

  const emojiInput = ref("");

  const lucideQuery = ref("");

  const uploading = ref(false);

  const uploadError = ref("");

  const previewUrl = ref<string | null>(null);

  const lucidePreviews = ref<Map<string, Component>>(new Map());

  const filteredLucide = computed(() => {
    const q = lucideQuery.value.trim().toLowerCase();

    if (!q) {
      return [...LUCIDE_PICKER_NAMES];
    }

    return LUCIDE_PICKER_NAMES.filter((name) => name.includes(q));
  });

  watch(
    filteredLucide,
    async (names) => {
      const next = new Map(lucidePreviews.value);

      await Promise.all(
        names.slice(0, 48).map(async (name) => {
          if (next.has(name)) {
            return;
          }

          const component = await loadLucideIcon(name);

          if (component) {
            next.set(name, component);
          }
        }),
      );

      lucidePreviews.value = next;
    },
    { immediate: true },
  );

  watch(
    () => options.modelValue(),
    (value) => {
      const parsed = parseIcon(value);

      if (parsed?.kind === "emoji") {
        emojiInput.value = parsed.value;
        tab.value = "emoji";
      } else if (parsed?.kind === "lucide") {
        lucideQuery.value = parsed.value;
        tab.value = "lucide";
      } else if (parsed?.kind === "image") {
        tab.value = "image";
      }
    },
    { immediate: true },
  );

  function selectEmoji(emoji: string) {
    options.emit("update:modelValue", serializeIcon({ kind: "emoji", value: emoji }));
    options.emit("pendingImage", null);
    options.close();
  }

  function selectLucide(name: string) {
    options.emit("update:modelValue", serializeIcon({ kind: "lucide", value: name }));
    options.emit("pendingImage", null);
    options.close();
  }

  function clearIcon() {
    options.emit("update:modelValue", null);
    options.emit("pendingImage", null);
    previewUrl.value = null;
    emojiInput.value = "";
    options.close();
  }

  async function handleImageFile(file: File) {
    uploadError.value = "";
    uploading.value = true;

    try {
      const blob = await autoCropSquareIcon(file, 128);

      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
      }

      previewUrl.value = URL.createObjectURL(blob);

      const collectiveId = options.collectiveId();

      const ownerPageId = options.ownerPageId();

      if (options.deferImageUpload() || !collectiveId || !ownerPageId) {
        options.emit("pendingImage", blob);
        options.emit("update:modelValue", serializeIcon({ kind: "image", value: "pending" }));
        return;
      }

      const form = new FormData();

      form.append("file", new File([blob], `icon-${Date.now()}.webp`, { type: "image/webp" }));

      const result = await apiFetch<{ path: string }>(
        `/api/collectives/${collectiveId}/pages/${ownerPageId}/attachments`,
        { method: "POST", body: form },
      );

      options.emit("update:modelValue", serializeIcon({ kind: "image", value: result.path }));
      options.emit("pendingImage", null);
      await nextTick();
      options.close();
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : "Bild-Upload fehlgeschlagen";
    } finally {
      uploading.value = false;
    }
  }

  function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (file) {
      void handleImageFile(file);
    }

    input.value = "";
  }

  function applyEmojiInput() {
    const value = emojiInput.value.trim();

    if (!value) {
      return;
    }

    selectEmoji(value);
  }

  return {
    tab,
    emojiInput,
    lucideQuery,
    uploading,
    uploadError,
    previewUrl,
    lucidePreviews,
    filteredLucide,
    selectEmoji,
    selectLucide,
    clearIcon,
    onFileChange,
    applyEmojiInput,
  };
}
