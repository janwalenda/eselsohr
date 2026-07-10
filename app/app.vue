<script setup lang="ts">
import { Toaster as Sonner } from "@/components/ui/sonner";

console.log("Route", useRoute().fullPath);
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Sonner rich-colors />
</template>
