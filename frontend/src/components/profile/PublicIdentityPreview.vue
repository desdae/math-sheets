<template>
  <aside class="profile-identity-preview">
    <p class="eyebrow">Public preview</p>
    <strong>{{ nickname || "Choose a nickname" }}</strong>
    <p class="lede">This is the name that appears on leaderboards and other learner-facing screens.</p>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  nickname: string;
}>();
</script>
