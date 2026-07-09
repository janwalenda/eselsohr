<script setup lang="ts">
import AppSidebar from '@/components/workspace/AppSidebar.vue'
import QuickSwitcher from '@/components/workspace/QuickSwitcher.vue'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { SearchIcon } from 'lucide-vue-next'

function openQuickSwitcher() {
  window.dispatchEvent(new Event('workspace:open-switcher'))
}
</script>

<template>
  <SidebarProvider :default-open="true" class="flex h-dvh overflow-hidden w-full">
    <AppSidebar />
    <SidebarInset class="flex h-dvh flex-col overflow-hidden">
      <header class="border-b border-border px-3 py-3">
        <div class="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" class="h-4" />
          <div class="text-sm text-muted-foreground flex-1">
            Collectives Workspace
          </div>
          <Button tooltip="Schnell wechseln" @click="openQuickSwitcher">
            <SearchIcon class="size-4" />
            <span>Seite suchen</span>
            <kbd class="ml-auto rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </Button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <slot />
      </div>
    </SidebarInset>
    <QuickSwitcher />
  </SidebarProvider>
</template>
