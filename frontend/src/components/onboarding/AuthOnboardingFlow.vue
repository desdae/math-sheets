<template>
  <section class="card onboarding-flow">
    <div class="onboarding-flow-header">
      <p class="eyebrow">Getting set up</p>
      <h2>{{ title }}</h2>
      <p class="lede">{{ description }}</p>
    </div>

    <div class="onboarding-stepper" aria-label="Onboarding progress">
      <span
        v-for="entry in steps"
        :key="entry.key"
        class="onboarding-step-pill"
        :class="{
          'onboarding-step-pill-active': entry.key === step,
          'onboarding-step-pill-complete': entry.done
        }"
      >
        {{ entry.label }}
      </span>
    </div>

    <div class="onboarding-flow-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  step: "nickname" | "import" | "done";
  hasLocalWorksheets?: boolean;
}>();

const title = computed(() => {
  if (props.step === "nickname") {
    return "Choose your public nickname";
  }

  if (props.step === "import") {
    return "Import local worksheets";
  }

  return "You're ready to go";
});

const description = computed(() => {
  if (props.step === "nickname") {
    return "Your Google account stays private. Pick the name the app will show publicly.";
  }

  if (props.step === "import") {
    return props.hasLocalWorksheets
      ? "You already practiced on this device. Decide whether to bring that work into your signed-in account."
      : "Your account is ready. Continue into the app.";
  }

  return "Your account is ready and your learning history is set up the way you want.";
});

const steps = computed(() => {
  const currentOrder = props.step === "nickname" ? 2 : props.step === "import" ? 3 : 4;

  return [
    { key: "account", label: "1. Account", done: currentOrder > 1 },
    { key: "nickname", label: "2. Nickname", done: currentOrder > 2 },
    { key: "import", label: "3. Import", done: currentOrder > 3 },
    { key: "done", label: "4. Dashboard", done: currentOrder > 4 }
  ];
});
</script>
