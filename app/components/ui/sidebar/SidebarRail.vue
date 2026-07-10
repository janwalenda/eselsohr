<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH_MIN, useSidebar } from "./utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const { toggleSidebar, open, setOpen, setSidebarWidth } = useSidebar();

let dragStartX = 0;

let dragDistance = 0;

let pointerId: number | null = null;

let cleanupDragListeners: (() => void) | null = null;

function stopDragging() {
  cleanupDragListeners?.();
  cleanupDragListeners = null;
  pointerId = null;
}

function startDragging(event: PointerEvent) {
  const rail = event.currentTarget as HTMLElement | null;

  const sidebar = rail?.closest("[data-side]") as HTMLElement | null;

  const side = sidebar?.dataset.side === "right" ? "right" : "left";

  dragStartX = event.clientX;
  dragDistance = 0;
  pointerId = event.pointerId;

  if (!open.value) {
    setOpen(true);
    setSidebarWidth(SIDEBAR_WIDTH_MIN);
  }

  rail?.setPointerCapture(event.pointerId);
  event.preventDefault();

  const handlePointerMove = (moveEvent: PointerEvent) => {
    dragDistance = Math.max(dragDistance, Math.abs(moveEvent.clientX - dragStartX));
    const nextWidth = side === "left" ? moveEvent.clientX : window.innerWidth - moveEvent.clientX;

    setSidebarWidth(nextWidth);
  };

  const handlePointerEnd = () => {
    if (rail && pointerId !== null && rail.hasPointerCapture(pointerId)) {
      rail.releasePointerCapture(pointerId);
    }

    stopDragging();
  };

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerEnd);
  window.addEventListener("pointercancel", handlePointerEnd);

  cleanupDragListeners = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerEnd);
    window.removeEventListener("pointercancel", handlePointerEnd);
  };
}

function handleClick(event: MouseEvent) {
  if (dragDistance > 3) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  toggleSidebar();
}
</script>

<template>
  <button
    type="button"
    data-sidebar="rail"
    data-slot="sidebar-rail"
    aria-label="Toggle Sidebar"
    :tabindex="-1"
    title="Toggle Sidebar"
    :class="
      cn(
        'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        props.class,
      )
    "
    @pointerdown="startDragging"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
