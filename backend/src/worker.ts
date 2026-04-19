import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./app.js";
import { configureWorkerEnv } from "./config/env.js";

const app = createApp();
app.listen(3000);
const handler = httpServerHandler({ port: 3000 });

export default {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    configureWorkerEnv(env);
    return handler.fetch(request, env, ctx);
  }
};
