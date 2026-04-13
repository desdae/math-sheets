<template>
  <section class="page-stack">
    <div class="card">
      <h1>Signing you in</h1>
      <p>We are connecting your Google account and checking whether you have local progress to import.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const router = useRouter();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

onMounted(async () => {
  try {
    await authStore.restoreSessionFromRefreshCookie();
  } catch {
    router.replace("/login");
    return;
  }

  if (authStore.needsNickname || worksheetStore.hasImportableAnonymousWorksheets) {
    router.replace("/complete-profile");
    return;
  }

  await worksheetStore.fetchRemoteWorksheets();
  router.replace("/dashboard");
});
</script>
