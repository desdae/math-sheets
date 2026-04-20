import { defineStore } from "pinia";
import { apiFetch, authTokenStorageKey, resolveGoogleAuthUrl, setStoredToken } from "../lib/api";

type User = {
  id: string;
  email: string;
  publicNickname: string | null;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    accessToken: localStorage.getItem(authTokenStorageKey) ?? "",
    hasCheckedAuth: false,
    isLoading: false
  }),
  getters: {
    needsNickname: (state) => Boolean(state.user && !state.user.publicNickname)
  },
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
      window.location.href = resolveGoogleAuthUrl(
        import.meta.env.VITE_API_BASE_URL,
        import.meta.env.DEV,
        window.location.origin
      );
    },
    async savePublicNickname(publicNickname: string) {
      const payload = await apiFetch<{ user: User }>("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ publicNickname })
      });

      this.user = payload.user;
      return payload.user;
    },
    async refreshAccessToken() {
      const payload = await apiFetch<{ accessToken: string }>("/auth/refresh", {
        method: "POST"
      });
      this.setAccessToken(payload.accessToken);
      return payload.accessToken;
    },
    async restoreSessionFromRefreshCookie() {
      await this.refreshAccessToken();
      await this.fetchMe();
    },
    async logout() {
      await apiFetch("/auth/logout", { method: "POST" });
      this.setAccessToken(null);
      this.user = null;
    }
  }
});
