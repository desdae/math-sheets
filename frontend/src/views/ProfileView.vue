<template>
  <section data-testid="profile-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Profile</p>
        <h1>{{ authStore.user?.publicNickname ?? "Anonymous user" }}</h1>
        <p v-if="authStore.user" class="lede">{{ authStore.user.email }}</p>
      </div>
      <button v-if="authStore.user" class="button button-secondary" @click="authStore.logout()">Log out</button>
    </div>

    <div v-if="authStore.user" class="card page-stack">
      <div>
        <h2>Public nickname</h2>
        <p class="lede">This is the name the app shows on leaderboards and other user-facing screens.</p>
      </div>
      <label>
        Nickname
        <input data-testid="profile-nickname-input" v-model.trim="nicknameDraft" type="text" maxlength="24" />
      </label>
      <p v-if="saveMessage">{{ saveMessage }}</p>
      <button data-testid="profile-nickname-save" class="button" :disabled="isSavingNickname" @click="saveNickname">
        {{ isSavingNickname ? "Saving..." : "Save nickname" }}
      </button>
    </div>

    <div v-if="authStore.user && stats" class="stat-grid">
      <StatCard label="Worksheets completed" :value="stats.worksheets_completed" />
      <StatCard label="Problems solved" :value="stats.problems_solved" />
      <StatCard label="Correct answers" :value="stats.correct_answers" />
      <StatCard label="Last activity" :value="formatDate(stats.last_activity_date)" />
    </div>

    <div v-else-if="!authStore.user" class="card">
      <p>Sign in with Google to sync history, unlock statistics, and appear on leaderboards.</p>
      <button class="button" @click="authStore.startGoogleSignIn()">Continue with Google</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import StatCard from "../components/common/StatCard.vue";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/format";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const stats = ref<Record<string, string | number> | null>(null);
const nicknameDraft = ref(authStore.user?.publicNickname ?? "");
const saveMessage = ref("");
const isSavingNickname = ref(false);

watch(
  () => authStore.user?.publicNickname,
  (nextValue) => {
    nicknameDraft.value = nextValue ?? "";
  },
  { immediate: true }
);

const saveNickname = async () => {
  if (!nicknameDraft.value) {
    saveMessage.value = "Enter a nickname to continue.";
    return;
  }

  isSavingNickname.value = true;
  saveMessage.value = "";

  try {
    await authStore.savePublicNickname(nicknameDraft.value);
    saveMessage.value = "Nickname saved.";
  } catch (error) {
    saveMessage.value = error instanceof Error ? error.message : "Unable to save nickname right now.";
  } finally {
    isSavingNickname.value = false;
  }
};

onMounted(async () => {
  if (authStore.user) {
    stats.value = await apiFetch("/users/me/stats");
  }
});
</script>
