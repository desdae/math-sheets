<template>
  <section data-testid="login-page" class="page-stack">
    <div class="card" style="max-width: 540px; margin: 0 auto;">
      <p class="eyebrow">Login</p>
      <h1>Sign in when you want sync and leaderboards.</h1>
      <p class="lede">
        You can keep using anonymous mode on this device, or continue with Google to save worksheets in PostgreSQL and
        show up on the leaderboard.
      </p>
      <div class="hero-actions">
        <button class="button" @click="authStore.startGoogleSignIn()">Continue with Google</button>
        <RouterLink class="button button-secondary" to="/generate">Stay anonymous</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
</script>
