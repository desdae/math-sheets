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

  it("includes default SEO metadata for search and social previews", () => {
    const html = readFileSync(indexHtmlPath, "utf8");

    expect(html).toContain('name="description"');
    expect(html).toContain('name="keywords"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('rel="canonical"');
  });

  it("includes a site-level web application schema block", () => {
    const html = readFileSync(indexHtmlPath, "utf8");

    expect(html).toContain('"@type": "WebApplication"');
    expect(html).toContain('"applicationCategory": "EducationalApplication"');
    expect(html).toContain('"operatingSystem": "Web"');
  });
});
