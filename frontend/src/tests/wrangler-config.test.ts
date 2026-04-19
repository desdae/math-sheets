// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const configPath = resolve(import.meta.dirname, "../../wrangler.jsonc");

describe("frontend wrangler config", () => {
  it("defines the mathsheets app worker with SPA asset fallback", () => {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      name: string;
      assets: { directory: string; not_found_handling: string };
    };

    expect(config.name).toBe("mathsheets-app");
    expect(config.assets).toEqual({
      directory: "./dist",
      not_found_handling: "single-page-application"
    });
  });
});
