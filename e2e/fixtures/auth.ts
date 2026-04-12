import { test as base } from "./base";
import { resetE2EDatabase } from "../utils/database";

export const test = base.extend({
  page: async ({ browser }, use) => {
    await resetE2EDatabase();

    const context = await browser.newContext();
    const response = await context.request.post("http://127.0.0.1:3001/api/test-auth/login", {
      data: {
        email: "e2e@example.com",
        displayName: "E2E User"
      }
    });

    if (!response.ok()) {
      throw new Error(`Failed to seed authenticated browser state: ${response.status()} ${await response.text()}`);
    }

    const payload = (await response.json()) as { accessToken: string };

    await context.addInitScript((token: string) => {
      window.localStorage.setItem("mathsheets.access_token", token);
    }, payload.accessToken);

    const page = await context.newPage();
    await use(page);
    await context.close();
  }
});
