<template>
  <div class="saved-library-quick-filters">
    <button
      v-for="filter in filters"
      :key="filter.value"
      :data-testid="`quick-filter-${filter.value}`"
      class="worksheet-filter-chip"
      :class="{ 'worksheet-filter-chip-active': activeFilters.has(filter.value) }"
      @click="$emit('toggle', filter.value)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  filters: Array<{ value: string; label: string }>;
  activeFilters: Set<string>;
}>();

defineEmits<{
  toggle: [value: string];
}>();
</script>
