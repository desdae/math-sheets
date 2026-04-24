// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mainCssPath = resolve(import.meta.dirname, "../styles/main.css");

describe("button layout styles", () => {
  it("gives CTA sections dedicated spacing and uses flex-based buttons", () => {
    const css = readFileSync(mainCssPath, "utf8");

    expect(css).toContain(".seo-landing-cta");
    expect(css).toContain("display: grid;");
    expect(css).toContain("justify-items: start;");
    expect(css).toContain(".button,");
    expect(css).toContain("display: inline-flex;");
    expect(css).toContain("align-items: center;");
    expect(css).toContain("justify-content: center;");
  });
});
