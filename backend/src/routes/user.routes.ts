import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { authenticate } from "../middleware/authenticate.js";
import { getUserHistory, getUserStatistics } from "../services/statistics.service.js";

export const userRouter = Router();

userRouter.get(
  "/me/stats",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getUserStatistics(req.user!.id));
  })
);

userRouter.get(
  "/me/history",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getUserHistory(req.user!.id));
  })
);
