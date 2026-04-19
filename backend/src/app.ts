import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { leaderboardRouter } from "./routes/leaderboard.routes.js";
import { testAuthRouter } from "./routes/test-auth.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { worksheetRouter } from "./routes/worksheet.routes.js";

export const createApp = () => {
  const app = express();
  app.disable("etag");

  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const authRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: env.NODE_ENV === "test" ? 2 : 12,
    keyPrefix: "auth"
  });
  const worksheetGenerationRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: env.NODE_ENV === "test" ? 2 : 30,
    keyPrefix: "worksheet-generate"
  });
  const worksheetImportRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: env.NODE_ENV === "test" ? 2 : 12,
    keyPrefix: "worksheet-import"
  });
  const profileRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: env.NODE_ENV === "test" ? 2 : 10,
    keyPrefix: "profile"
  });
  const leaderboardRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: env.NODE_ENV === "test" ? 2 : 60,
    keyPrefix: "leaderboard"
  });

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(
    cors({
      origin: env.APP_BASE_URL,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth/google", authRateLimit);
  app.use("/api/auth/refresh", authRateLimit);
  app.use("/api/users/me/profile", profileRateLimit);
  app.use("/api/worksheets/generate", worksheetGenerationRateLimit);
  app.use("/api/worksheets/import-local", worksheetImportRateLimit);
  app.use("/api/leaderboards", leaderboardRateLimit);
  app.use("/api/auth", authRouter);
  app.use("/api/test-auth", testAuthRouter);
  app.use("/api/worksheets", worksheetRouter);
  app.use("/api/users", userRouter);
  app.use("/api/leaderboards", leaderboardRouter);

  app.use(errorHandler);

  return app;
};
