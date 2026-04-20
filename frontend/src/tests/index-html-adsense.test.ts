// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexHtmlPath = resolve(import.meta.dirname, "../../index.html");

describe("frontend index.html", () => {
  it("includes the AdSense verification script in the document head", () => {
    const html = readFileSync(indexHtmlPath, "utf8");

    expect(html).toContain('src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=%VITE_ADSENSE_CLIENT_ID%"');
    expect(html).toContain('crossorigin="anonymous"');
  });
});
