import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";
import { updatePublicNickname } from "../repositories/user.repository.js";
import { updatePublicNicknameSchema } from "../schemas/user.schema.js";
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

userRouter.patch(
  "/me/profile",
  authenticate,
  validateBody(updatePublicNicknameSchema),
  asyncHandler(async (req, res) => {
    const user = await updatePublicNickname(req.user!.id, req.body.publicNickname);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        publicNickname: user.public_nickname
      }
    });
  })
);
