<template>
  <section data-testid="saved-worksheets-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Saved worksheets</p>
        <h1>Continue where you left off</h1>
      </div>
    </div>

    <div class="two-column">
      <div class="page-stack">
        <h2>Local</h2>
        <RouterLink
          v-for="worksheet in worksheetStore.anonymousWorksheets"
          :key="worksheet.id"
          data-testid="saved-local-worksheet-link"
          class="card link-card"
          :to="`/worksheets/${worksheet.id}`"
        >
          <strong>{{ worksheet.title }}</strong>
          <span>{{ worksheet.status }} • {{ worksheet.questions.length }} problems</span>
        </RouterLink>
        <EmptyState
          v-if="worksheetStore.anonymousWorksheets.length === 0"
          title="No local worksheets"
          description="Generate a worksheet and it will appear here."
        />
      </div>

      <div class="page-stack">
        <h2>Synced</h2>
        <RouterLink
          v-for="worksheet in worksheetStore.remoteWorksheets"
          :key="String(worksheet.id)"
          data-testid="saved-remote-worksheet-link"
          class="card link-card"
          :to="`/worksheets/${worksheet.id}`"
        >
          <strong>{{ worksheet.title }}</strong>
          <span>{{ worksheet.status }} • {{ worksheet.problemCount ?? worksheet.problem_count }} problems</span>
        </RouterLink>
        <EmptyState
          v-if="worksheetStore.remoteWorksheets.length === 0"
          title="No synced worksheets"
          description="Sign in and save a worksheet to build your history."
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink } from "vue-router";
import EmptyState from "../components/common/EmptyState.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

onMounted(async () => {
  if (authStore.user) {
    await worksheetStore.fetchRemoteWorksheets();
  }
});
</script>
