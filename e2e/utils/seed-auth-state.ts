import { config } from "dotenv";
import { request } from "@playwright/test";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.e2e") });

const context = await request.newContext();
const response = await context.post("http://127.0.0.1:3001/api/test-auth/login", {
  data: {
    email: "e2e@example.com",
    displayName: "E2E User"
  }
});

if (!response.ok()) {
  throw new Error(`Failed to seed auth state: ${response.status()} ${await response.text()}`);
}

const payload = (await response.json()) as { accessToken: string };

console.log(payload.accessToken);

await context.dispose();
