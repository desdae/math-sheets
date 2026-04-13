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
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

onMounted(async () => {
  const accessToken = typeof route.query.access_token === "string" ? route.query.access_token : null;

  if (accessToken) {
    authStore.setAccessToken(accessToken);
  }

  await authStore.fetchMe();
  if (authStore.needsNickname) {
    router.replace("/complete-profile");
    return;
  }

  await worksheetStore.fetchRemoteWorksheets();
  await worksheetStore.maybePromptForImport();
  router.replace("/dashboard");
});
</script>
