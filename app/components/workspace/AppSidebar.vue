<script setup lang="ts">
import { LogOutIcon, SearchIcon } from "lucide-vue-next";
import CollectivesSidebarSection from "@/components/workspace/CollectivesSidebarSection.vue";
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
} from "@/components/ui/sidebar";

const route = useRoute();

const { isMobile, setOpenMobile } = useSidebar();

watch(
  () => route.fullPath,
  () => {
    if (isMobile.value) {
      setOpenMobile(false);
    }
  },
);

const { session, signOut } = useNcSession();

const nextcloudHost = computed(() => {
  if (!session.value) {
    return "";
  }

  try {
    return new URL(session.value.ncUrl).host;
  } catch {
    return session.value.ncUrl;
  }
});

async function handleSignOut() {
  await signOut();
  await navigateTo("/login");
}

function openQuickSwitcher() {
  window.dispatchEvent(new Event("workspace:open-switcher"));
}
</script>

<template>
  <Sidebar collapsible="offcanvas">
    <SidebarHeader>
      <div class="flex items-center gap-2 px-2 py-1.5">
        <div
          class="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-semibold"
        >
          {{ session?.loginName?.charAt(0) ?? "E" }}
        </div>
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">Eselsohr</div>
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

      <CollectivesSidebarSection />
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
