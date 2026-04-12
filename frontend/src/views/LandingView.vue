<template>
  <section data-testid="landing-page" class="hero-panel">
    <div>
      <p class="eyebrow">Printable math practice</p>
      <h1>Math practice that starts anonymously and grows with your progress.</h1>
      <p class="lede">
        Generate arithmetic worksheets, save them locally right away, then sign in with Google when you want sync,
        statistics, and leaderboard rankings.
      </p>
      <div class="hero-actions">
        <RouterLink class="button" to="/generate">Try it now</RouterLink>
        <button class="button button-secondary" @click="authStore.startGoogleSignIn()">Continue with Google</button>
      </div>
    </div>
    <div class="hero-preview card">
      <p>Supported operations</p>
      <strong>+, -, *, /</strong>
      <p>Difficulty presets</p>
      <strong>Easy, Medium, Hard</strong>
      <p>Print-first layouts</p>
      <strong>Small, Medium, Large</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
</script>
