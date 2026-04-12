import { z } from "zod";

export const leaderboardQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  metric: z.enum(["worksheets", "problems", "accuracy"]).default("worksheets")
});
