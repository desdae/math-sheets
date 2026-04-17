import { httpServerHandler } from "cloudflare:node";
import { env as workerEnv } from "cloudflare:workers";
import { createApp } from "./app.js";
import { configureWorkerEnv } from "./config/env.js";

configureWorkerEnv(workerEnv);

const app = createApp();

app.listen(3000);

export default httpServerHandler({ port: 3000 });
