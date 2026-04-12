import { expect, test as base } from "@playwright/test";

export const test = base.extend<{
  consoleErrors: string[];
  pageErrors: string[];
  failedApiResponses: string[];
}>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });

      await use(errors);

      expect(errors, "unexpected console.error output").toEqual([]);
    },
    { auto: true }
  ],
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];

      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      await use(errors);

      expect(errors, "unexpected uncaught page errors").toEqual([]);
    },
    { auto: true }
  ],
  failedApiResponses: [
    async ({ page }, use) => {
      const failures: string[] = [];

      page.on("response", (response) => {
        if (response.url().includes("/api/") && response.status() >= 400) {
          failures.push(`${response.status()} ${response.url()}`);
        }
      });

      await use(failures);

      expect(failures, "unexpected api failures").toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };
