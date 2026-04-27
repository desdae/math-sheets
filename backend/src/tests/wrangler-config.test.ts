// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const configPath = resolve(import.meta.dirname, "../../wrangler.jsonc");

describe("backend wrangler config", () => {
  it("points production auth redirects and cookies at the split frontend and api domains", () => {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      vars: {
        APP_BASE_URL: string;
        CORS_ALLOWED_ORIGINS: string;
        GOOGLE_CALLBACK_URL: string;
        COOKIE_DOMAIN: string;
      };
    };

    expect(config.vars.APP_BASE_URL).toBe("https://mathsheet.app");
    expect(config.vars.CORS_ALLOWED_ORIGINS.split(",")).toEqual([
      "https://mathsheet.app",
      "https://www.mathsheet.app"
    ]);
    expect(config.vars.GOOGLE_CALLBACK_URL).toBe("https://api.mathsheet.app/api/auth/google/callback");
    expect(config.vars.COOKIE_DOMAIN).toBe("mathsheet.app");
  });
});
