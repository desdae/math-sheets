import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: () => import("../views/LandingView.vue") },
  { path: "/login", component: () => import("../views/LoginView.vue") },
  { path: "/auth/callback", component: () => import("../views/AuthCallbackView.vue") },
  { path: "/dashboard", component: () => import("../views/DashboardView.vue") },
  { path: "/generate", component: () => import("../views/GeneratorView.vue") },
  { path: "/worksheets", component: () => import("../views/SavedWorksheetsView.vue") },
  { path: "/worksheets/:id", component: () => import("../views/WorksheetView.vue") },
  { path: "/leaderboard", component: () => import("../views/LeaderboardView.vue") },
  { path: "/profile", component: () => import("../views/ProfileView.vue") }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
