<template>
  <section data-testid="saved-worksheets-page" class="page-stack saved-library-page">
    <header class="saved-library-hero">
      <p class="eyebrow">Saved worksheets</p>
      <h1>Your worksheet library</h1>
      <p class="lede">
        Browse recent practice by day, reopen unfinished work, and filter by the skills you want to revisit.
      </p>
    </header>

    <SavedWorksheetFilterBar
      v-if="activeFilters.size > 0"
      :active-filters="activeFilters"
      :filter-labels="activeFilterLabels"
      @remove="toggleFilter"
      @clear="clearFilters"
    />

    <SavedWorksheetQuickFilters
      :filters="quickFilters"
      :active-filters="activeFilters"
      @toggle="toggleFilter"
    />

    <section v-if="showSyncedSection" class="saved-library-section">
      <div class="saved-library-section-header">
        <div>
          <p class="eyebrow">Synced worksheets</p>
          <h2>Recent history</h2>
        </div>
      </div>

      <div v-if="showFilteredEmpty" class="empty-state saved-library-empty">
        <h3>No worksheets match these filters</h3>
        <p>Clear the active filters to see more of your worksheet history.</p>
        <button data-testid="clear-all-empty-filters" class="button-secondary" @click="clearFilters">Clear all</button>
      </div>

      <EmptyState
        v-else-if="syncedRecords.length === 0"
        title="No synced worksheets"
        description="Sign in and save a worksheet to build your history."
      />

      <div v-else class="saved-library-groups">
        <section v-for="group in visibleGroups" :key="group.key" class="saved-library-group">
          <div class="saved-library-group-header">
            <h3>{{ group.label }}</h3>
            <span>{{ group.items.length }} worksheets</span>
          </div>

          <SavedWorksheetRow
            v-for="worksheet in group.items"
            :key="worksheet.id"
            :worksheet="worksheet"
            :active-filters="activeFilters"
            scope="synced"
            @open="openWorksheet"
            @toggle-filter="toggleFilter"
          />
        </section>
      </div>
    </section>

    <section v-if="hasLocalWorksheets" class="saved-library-section saved-library-section-local">
      <div class="saved-library-section-header">
        <div>
          <p class="eyebrow">Local on this device</p>
          <h2>Unsynced progress</h2>
          <p class="saved-library-support">These worksheets are stored in this browser until you import them.</p>
        </div>

        <button
          v-if="canImportLocal"
          data-testid="import-local-worksheets"
          class="button-secondary"
          @click="handleImportLocal"
        >
          Import new local worksheets
        </button>
      </div>

      <div class="saved-library-local-list">
        <SavedWorksheetRow
          v-for="worksheet in filteredLocalRecords"
          :key="worksheet.id"
          :worksheet="worksheet"
          :active-filters="activeFilters"
          scope="local"
          @open="openWorksheet"
          @toggle-filter="toggleFilter"
        />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import EmptyState from "../components/common/EmptyState.vue";
import SavedWorksheetFilterBar from "../components/worksheet/SavedWorksheetFilterBar.vue";
import SavedWorksheetQuickFilters from "../components/worksheet/SavedWorksheetQuickFilters.vue";
import SavedWorksheetRow from "../components/worksheet/SavedWorksheetRow.vue";
import {
  buildWorksheetDateGroups,
  filterWorksheetRecords,
  getWorksheetFilterLabel,
  type WorksheetSummaryRecord
} from "../lib/saved-worksheets";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const router = useRouter();
const worksheetStore = useWorksheetStore();

const activeFilters = ref<Set<string>>(new Set());
const quickFilters = [
  { value: "partial", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "date:today", label: "Today" },
  { value: "date:this-week", label: "This week" },
  { value: "addition", label: "Addition" },
  { value: "multiplication", label: "Multiplication" }
];

const localRecords = computed<WorksheetSummaryRecord[]>(() =>
  worksheetStore.anonymousWorksheets.map((worksheet) => ({
    id: worksheet.id,
    title: worksheet.title,
    status: worksheet.status,
    difficulty: worksheet.config.difficulty,
    problemCount: worksheet.questions.length,
    allowedOperations: worksheet.config.allowedOperations,
    numberRangeMin: worksheet.config.numberRangeMin,
    numberRangeMax: worksheet.config.numberRangeMax,
    worksheetSize: worksheet.config.worksheetSize,
    cleanDivisionOnly: worksheet.config.cleanDivisionOnly,
    source: worksheet.source,
    createdAt: worksheet.createdAt,
    submittedAt: worksheet.submittedAt ?? null,
    result: worksheet.result
  }))
);

const syncedRecords = computed(() => worksheetStore.remoteWorksheets);
const filteredLocalRecords = computed(() => filterWorksheetRecords(localRecords.value, activeFilters.value));
const filteredSyncedRecords = computed(() => filterWorksheetRecords(syncedRecords.value, activeFilters.value));
const filterLabelSourceRecords = computed(() => [...syncedRecords.value, ...localRecords.value]);
const activeFilterLabels = computed(() =>
  Object.fromEntries(
    Array.from(activeFilters.value).map((value) => [value, getWorksheetFilterLabel(value, filterLabelSourceRecords.value)])
  )
);
const visibleGroups = computed(() => buildWorksheetDateGroups(filteredSyncedRecords.value, new Date()).filter((group) => group.items.length > 0));
const hasLocalWorksheets = computed(() => filteredLocalRecords.value.length > 0);
const canImportLocal = computed(() => Boolean(authStore.user && hasLocalWorksheets.value));
const showFilteredEmpty = computed(() => syncedRecords.value.length > 0 && filteredSyncedRecords.value.length === 0);
const showSyncedSection = computed(() => syncedRecords.value.length > 0);

const toggleFilter = (value: string) => {
  const next = new Set(activeFilters.value);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  activeFilters.value = next;
};

const clearFilters = () => {
  activeFilters.value = new Set();
};

const openWorksheet = async (worksheetId: string) => {
  await router.push(`/worksheets/${worksheetId}`);
};

const handleImportLocal = async () => {
  await worksheetStore.importAnonymousWorksheets();
};

onMounted(async () => {
  if (authStore.user && worksheetStore.remoteWorksheets.length === 0) {
    await worksheetStore.fetchRemoteWorksheets();
  }
});
</script>
