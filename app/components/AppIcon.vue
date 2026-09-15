<script setup lang="ts">
import { useAppIcon } from "@/composables/useAppIcon";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    icon?: string | null;
    collectiveId?: number | null;
    ownerPageId?: number | null;
    token?: string | null;
    fallbackLucide?: string | null;
    fallbackEmoji?: string | null;
    class?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    icon: null,
    collectiveId: null,
    ownerPageId: null,
    token: null,
    fallbackLucide: null,
    fallbackEmoji: null,
    size: "md",
  },
);

const { sizeClass, lucideComponent, imageSrc, emojiText, showLucide } = useAppIcon(props);
</script>

<template>
  <img
    v-if="imageSrc"
    :src="imageSrc"
    alt=""
    :class="cn('inline-block shrink-0 rounded-sm object-cover', sizeClass, props.class)"
  />
  <span
    v-else-if="emojiText"
    :class="
      cn('inline-flex shrink-0 items-center justify-center leading-none', sizeClass, props.class)
    "
    aria-hidden="true"
  >
    {{ emojiText }}
  </span>
  <component
    :is="lucideComponent"
    v-else-if="showLucide && lucideComponent"
    :class="cn('inline-block shrink-0', sizeClass, props.class)"
  />
  <span v-else :class="cn('inline-block shrink-0', sizeClass, props.class)" aria-hidden="true" />
</template>
