import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./app.js";
import { configureWorkerEnv } from "./config/env.js";

type WorkerHandler = ReturnType<typeof httpServerHandler>;

let handler: WorkerHandler | null = null;

const getHandler = (env: Record<string, unknown>) => {
  if (!handler) {
    configureWorkerEnv(env);

    const app = createApp();
    app.listen(3000);
    handler = httpServerHandler({ port: 3000 });
  }

  return handler;
};

export default {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    return getHandler(env).fetch(request, env, ctx);
  }
};
