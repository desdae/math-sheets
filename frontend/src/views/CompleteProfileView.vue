<template>
  <section class="page-stack" data-testid="complete-profile-page">
    <AuthOnboardingFlow :step="currentStep" :has-local-worksheets="worksheetStore.hasImportableAnonymousWorksheets">
      <template v-if="currentStep === 'nickname'">
        <div class="page-stack onboarding-panel">
          <label>
            Public nickname
            <input data-testid="nickname-input" v-model.trim="publicNickname" type="text" maxlength="24" />
          </label>
          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
          <button data-testid="nickname-submit" class="button" :disabled="isSaving" @click="saveNickname">
            {{ isSaving ? "Saving..." : "Save and continue" }}
          </button>
        </div>
      </template>

      <template v-else-if="currentStep === 'import'">
        <div class="page-stack onboarding-panel">
          <div class="card onboarding-choice-card">
            <h3>Import saved progress?</h3>
            <p class="lede">
              You have {{ worksheetStore.anonymousWorksheets.length }} worksheet{{
                worksheetStore.anonymousWorksheets.length === 1 ? "" : "s"
              }} stored in this browser.
            </p>
            <div class="modal-actions">
              <button data-testid="import-local-decline" class="button button-secondary" @click="skipImport">
                Keep local only
              </button>
              <button data-testid="import-local-confirm" class="button" @click="importWorksheets">
                Import progress
              </button>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="page-stack onboarding-panel">
          <p class="lede">Everything is ready. Head to your dashboard to keep practicing.</p>
          <button class="button" @click="router.push('/dashboard')">Open dashboard</button>
        </div>
      </template>
    </AuthOnboardingFlow>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AuthOnboardingFlow from "../components/onboarding/AuthOnboardingFlow.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const router = useRouter();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

const publicNickname = ref("");
const errorMessage = ref("");
const isSaving = ref(false);

const currentStep = computed<"nickname" | "import" | "done">(() => {
  if (authStore.needsNickname) {
    return "nickname";
  }

  if (worksheetStore.hasImportableAnonymousWorksheets) {
    return "import";
  }

  return "done";
});

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

    if (!worksheetStore.hasImportableAnonymousWorksheets) {
      await router.push("/dashboard");
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to save nickname right now.";
  } finally {
    isSaving.value = false;
  }
};

const importWorksheets = async () => {
  await worksheetStore.importAnonymousWorksheets();
  await router.push("/dashboard");
};

const skipImport = async () => {
  worksheetStore.rememberImportDecision("declined");
  await router.push("/dashboard");
};
</script>
