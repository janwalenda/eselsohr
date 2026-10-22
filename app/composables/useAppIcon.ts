import { computed, shallowRef, watch, type Component } from "vue";
import {
  buildAttachmentProxyBase,
  buildPublicAttachmentProxyBase,
  encodeAttachmentPath,
  isValidAttachmentRelativePath,
} from "~~/shared/collective-attachments";
import { parseIcon } from "~~/shared/icons";
import { loadLucideIcon } from "@/lib/lucide";

export function useAppIcon(props: {
  icon?: string | null;
  collectiveId?: number | null;
  ownerPageId?: number | null;
  token?: string | null;
  fallbackLucide?: string | null;
  fallbackEmoji?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = computed(() => {
    switch (props.size ?? "md") {
      case "sm":
        return "size-3.5 text-sm";
      case "lg":
        return "size-6 text-lg";
      default:
        return "size-4 text-base";
    }
  });

  const descriptor = computed(() => parseIcon(props.icon));

  const lucideComponent = shallowRef<Component | null>(null);

  watch(
    () => {
      const desc = descriptor.value;

      if (desc?.kind === "lucide") {
        return desc.value;
      }

      if (!desc && props.fallbackLucide) {
        return props.fallbackLucide;
      }

      return null;
    },
    async (name) => {
      if (!name) {
        lucideComponent.value = null;
        return;
      }

      lucideComponent.value = await loadLucideIcon(name);
    },
    { immediate: true },
  );

  const imageSrc = computed(() => {
    const desc = descriptor.value;

    if (!desc || desc.kind !== "image") {
      return null;
    }

    const path = desc.value.replace(/^\.\//, "");

    if (!isValidAttachmentRelativePath(path) || !props.ownerPageId) {
      return null;
    }

    const encoded = encodeAttachmentPath(path);

    if (props.token) {
      return `${buildPublicAttachmentProxyBase(props.token, props.ownerPageId)}/${encoded}`;
    }

    if (props.collectiveId) {
      return `${buildAttachmentProxyBase(props.collectiveId, props.ownerPageId)}/${encoded}`;
    }

    return null;
  });

  const emojiText = computed(() => {
    const desc = descriptor.value;

    if (desc?.kind === "emoji") {
      return desc.value;
    }

    if (!desc && props.fallbackEmoji) {
      return props.fallbackEmoji;
    }

    return null;
  });

  const showLucide = computed(
    () =>
      Boolean(lucideComponent.value) &&
      (descriptor.value?.kind === "lucide" || Boolean(!descriptor.value && props.fallbackLucide)),
  );

  return {
    sizeClass,
    lucideComponent,
    imageSrc,
    emojiText,
    showLucide,
  };
}
