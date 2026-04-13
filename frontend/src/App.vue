<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import AppShell from "./components/layout/AppShell.vue";
import { useAuthStore } from "./stores/auth";
import { useWorksheetStore } from "./stores/worksheet";

const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

onMounted(async () => {
  if (authStore.accessToken) {
    await authStore.fetchMe();
    await worksheetStore.fetchRemoteWorksheets();
  }
});
</script>
