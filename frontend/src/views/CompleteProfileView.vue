<template>
  <section class="page-stack" data-testid="complete-profile-page">
    <div class="card" style="max-width: 540px; margin: 0 auto;">
      <p class="eyebrow">Finish setup</p>
      <h1>Choose your public nickname</h1>
      <p class="lede">Google account details stay private. This nickname is what the app will show publicly.</p>
      <label>
        Public nickname
        <input data-testid="nickname-input" v-model.trim="publicNickname" type="text" maxlength="24" />
      </label>
      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
      <button data-testid="nickname-submit" class="button" :disabled="isSaving" @click="saveNickname">
        {{ isSaving ? "Saving..." : "Save and continue" }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const router = useRouter();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

const publicNickname = ref("");
const errorMessage = ref("");
const isSaving = ref(false);

const saveNickname = async () => {
  if (!publicNickname.value) {
    errorMessage.value = "Enter a public nickname to continue.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  try {
    await authStore.savePublicNickname(publicNickname.value);
    await worksheetStore.fetchRemoteWorksheets();
    await worksheetStore.maybePromptForImport();
    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to save nickname right now.";
  } finally {
    isSaving.value = false;
  }
};
</script>
