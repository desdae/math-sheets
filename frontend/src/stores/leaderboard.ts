import { defineStore } from "pinia";
import { apiFetch } from "../lib/api";

type LeaderboardMetric = "worksheets" | "problems" | "accuracy";
type LeaderboardPeriod = "daily" | "weekly" | "monthly";

type LeaderboardRow = {
  user_id: string;
  public_nickname: string;
  worksheets_completed: number;
  problems_solved: number;
  correct_answers: number;
  accuracy_percentage: number;
};

export const useLeaderboardStore = defineStore("leaderboard", {
  state: () => ({
    period: "daily" as LeaderboardPeriod,
    metric: "worksheets" as LeaderboardMetric,
    rows: [] as LeaderboardRow[],
    isLoading: false
  }),
  actions: {
    async fetchLeaderboard() {
      this.isLoading = true;

      try {
        const payload = await apiFetch<{ leaderboard: LeaderboardRow[] }>(
          `/leaderboards?period=${this.period}&metric=${this.metric}`
        );
        this.rows = payload.leaderboard;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
