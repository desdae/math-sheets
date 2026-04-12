<template>
  <div v-if="open" data-testid="import-local-modal" class="modal-backdrop">
    <div class="modal-card">
      <h2>Import local progress?</h2>
      <p>You have worksheets saved on this device. Import them into your new account to keep your progress.</p>
      <div class="modal-actions">
        <button data-testid="import-local-decline" class="button button-secondary" @click="$emit('decline')">
          Keep local only
        </button>
        <button data-testid="import-local-confirm" class="button" @click="$emit('confirm')">Import progress</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>();
defineEmits<{
  confirm: [];
  decline: [];
}>();
</script>
