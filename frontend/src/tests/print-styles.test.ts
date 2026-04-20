// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheetPath = resolve(import.meta.dirname, "../styles/main.css");

describe("print stylesheet", () => {
  it("hides worksheet review chrome and keeps expressions on one line", () => {
    const css = readFileSync(stylesheetPath, "utf8");

    expect(css).toContain("@media print");
    expect(css).toContain(".worksheet-review-panel");
    expect(css).toContain(".worksheet-answer-label");
    expect(css).toContain("white-space: nowrap");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) 92px");
  });
});
