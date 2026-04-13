<template>
  <div data-testid="saved-filter-bar" class="saved-library-filter-bar">
    <div class="saved-library-filter-list">
      <button
        v-for="value in filterValues"
        :key="value"
        :data-testid="`active-filter-${value}`"
        class="worksheet-filter-chip worksheet-filter-chip-active"
        @click="$emit('remove', value)"
      >
        {{ filterLabels[value] ?? value }}
      </button>
    </div>
    <button data-testid="clear-all-filters" class="button-secondary saved-library-clear" @click="$emit('clear')">
      Clear all
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  activeFilters: Set<string>;
  filterLabels: Record<string, string>;
}>();

defineEmits<{
  remove: [value: string];
  clear: [];
}>();

const filterValues = computed(() => Array.from(props.activeFilters.values()));
</script>
