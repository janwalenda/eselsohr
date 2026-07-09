<script setup lang="ts">
import { LogOutIcon, SearchIcon } from 'lucide-vue-next'
import CollectiveSidebarGroup from '@/components/workspace/CollectiveSidebarGroup.vue'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

const route = useRoute()
const { isMobile, setOpenMobile } = useSidebar()

watch(() => route.fullPath, () => {
  if (isMobile.value) {
    setOpenMobile(false)
  }
})

const { session, signOut } = useNcSession()
const { collectives, pending, error } = useCollectives()

const currentCollectiveId = computed(() => Number(route.params.collectiveId))
const activePageId = computed(() => {
  const pageId = Number(route.params.pageId)
  return Number.isFinite(pageId) ? pageId : null
})

const nextcloudHost = computed(() => {
  if (!session.value) {
    return ''
  }

  try {
    return new URL(session.value.ncUrl).host
  }
  catch {
    return session.value.ncUrl
  }
})

async function handleSignOut() {
  await signOut()
  await navigateTo('/login')
}

function openQuickSwitcher() {
  window.dispatchEvent(new Event('workspace:open-switcher'))
}
</script>

<template>
  <Sidebar collapsible="offcanvas">
    <SidebarHeader>
      <div class="flex items-center gap-2 px-2 py-1.5">
        <div class="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-semibold">
          {{ session?.loginName.charAt(0) }}
        </div>
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">
            Eselsohr
          </div>
          <div class="truncate text-xs text-sidebar-foreground/70">
            {{ session?.loginName }}@{{ nextcloudHost }}
          </div>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup class="max-sm:hidden">
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Schnell wechseln" @click="openQuickSwitcher">
                <SearchIcon class="size-4" />
                <span>Seite suchen</span>
                <kbd class="ml-auto rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Collectives</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu v-if="pending">
            <SidebarMenuItem>
              <Skeleton class="h-8 w-full" />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Skeleton class="h-8 w-5/6" />
            </SidebarMenuItem>
          </SidebarMenu>

          <div v-else-if="error" class="px-2 text-sm text-destructive">
            {{ error.message }}
          </div>

          <SidebarMenu v-else>
            <CollectiveSidebarGroup
              v-for="collective in collectives"
              :key="collective.id"
              :collective="collective"
              :is-active="currentCollectiveId === collective.id"
              :active-page-id="currentCollectiveId === collective.id ? activePageId : null"
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton @click="handleSignOut">
            <LogOutIcon class="size-4" />
            <span>Abmelden</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
