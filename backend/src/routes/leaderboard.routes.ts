import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { validateQuery } from "../middleware/validate.js";
import { getLeaderboard } from "../repositories/leaderboard.repository.js";
import { leaderboardQuerySchema } from "../schemas/leaderboard.schema.js";

export const leaderboardRouter = Router();

leaderboardRouter.get(
  "/",
  validateQuery(leaderboardQuerySchema),
  asyncHandler(async (req, res) => {
    const query = res.locals.validatedQuery as {
      period: "daily" | "weekly" | "monthly";
      metric: "worksheets" | "problems" | "accuracy";
    };
    const period = query.period;
    const metric = query.metric;

    res.json({
      period,
      metric,
      leaderboard: await getLeaderboard({ period, metric })
    });
  })
);
