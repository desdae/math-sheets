<template>
  <div class="page-stack">
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

    <section class="card landing-topic-links">
      <h2>Explore worksheet topics</h2>
      <div class="topic-link-grid">
        <RouterLink to="/addition-worksheets">Addition worksheets</RouterLink>
        <RouterLink to="/subtraction-worksheets">Subtraction worksheets</RouterLink>
        <RouterLink to="/multiplication-worksheets">Multiplication worksheets</RouterLink>
        <RouterLink to="/division-worksheets">Division worksheets</RouterLink>
        <RouterLink to="/grade-1-math-worksheets">Grade 1 math worksheets</RouterLink>
        <RouterLink to="/math-worksheets-with-answers">Math worksheets with answers</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
</script>
