import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { leaderboardRouter } from "./routes/leaderboard.routes.js";
import { testAuthRouter } from "./routes/test-auth.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { worksheetRouter } from "./routes/worksheet.routes.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.APP_BASE_URL,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/test-auth", testAuthRouter);
  app.use("/api/worksheets", worksheetRouter);
  app.use("/api/users", userRouter);
  app.use("/api/leaderboards", leaderboardRouter);

  app.use(errorHandler);

  return app;
};
