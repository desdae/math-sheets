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

    <div v-if="authStore.user" class="profile-layout">
      <section class="card page-stack">
        <div>
          <p class="eyebrow">Public identity</p>
          <h2>Choose what the app shows publicly</h2>
          <p class="lede">This nickname appears on leaderboards and other learner-facing parts of MathSheets.</p>
        </div>
        <label>
          Nickname
          <input data-testid="profile-nickname-input" v-model.trim="nicknameDraft" type="text" maxlength="24" />
        </label>
        <p v-if="saveMessage">{{ saveMessage }}</p>
        <button data-testid="profile-nickname-save" class="button" :disabled="isSavingNickname" @click="saveNickname">
          {{ isSavingNickname ? "Saving..." : "Save nickname" }}
        </button>
      </section>

      <section class="card page-stack">
        <div>
          <p class="eyebrow">Private account</p>
          <h2>Google account details stay private</h2>
          <p class="lede">Your Google profile is used only for account access. Public screens use your nickname instead.</p>
        </div>
        <p>{{ authStore.user.email }}</p>
        <PublicIdentityPreview :nickname="nicknameDraft || authStore.user.publicNickname || ''" />
      </section>
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
import PublicIdentityPreview from "../components/profile/PublicIdentityPreview.vue";
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
