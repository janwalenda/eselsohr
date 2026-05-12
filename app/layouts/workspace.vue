<script setup lang="ts">
import AppSidebar from '@/components/workspace/AppSidebar.vue'
import QuickSwitcher from '@/components/workspace/QuickSwitcher.vue'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
</script>

<template>
  <SidebarProvider :default-open="true" class="flex min-h-svh w-full">
    <AppSidebar />
    <SidebarInset class="min-h-dvh">
      <header class="border-b border-border px-3 py-3">
        <div class="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" class="h-4" />
          <div class="text-sm text-muted-foreground">
            Collectives Workspace
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-hidden">
        <slot />
      </div>
    </SidebarInset>
    <QuickSwitcher />
  </SidebarProvider>
</template>
