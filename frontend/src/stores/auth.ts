import { defineStore } from "pinia";
import { apiFetch, authTokenStorageKey, setStoredToken } from "../lib/api";

type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    accessToken: localStorage.getItem(authTokenStorageKey) ?? "",
    hasCheckedAuth: false,
    isLoading: false
  }),
  actions: {
    setAccessToken(token: string | null) {
      this.accessToken = token ?? "";
      setStoredToken(token);
    },
    async fetchMe() {
      this.isLoading = true;

      try {
        const payload = await apiFetch<{ user: User }>("/auth/me");
        this.user = payload.user;
      } catch {
        this.user = null;
      } finally {
        this.hasCheckedAuth = true;
        this.isLoading = false;
      }
    },
    startGoogleSignIn() {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"}/auth/google`;
    },
    async refreshAccessToken() {
      const payload = await apiFetch<{ accessToken: string }>("/auth/refresh", {
        method: "POST"
      });
      this.setAccessToken(payload.accessToken);
      return payload.accessToken;
    },
    async logout() {
      await apiFetch("/auth/logout", { method: "POST" });
      this.setAccessToken(null);
      this.user = null;
    }
  }
});
