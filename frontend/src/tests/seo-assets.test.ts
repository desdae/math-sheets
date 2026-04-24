// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const robotsTxtPath = resolve(import.meta.dirname, "../../public/robots.txt");
const sitemapXmlPath = resolve(import.meta.dirname, "../../public/sitemap.xml");

describe("SEO public assets", () => {
  it("allows GPTBot and OAI-SearchBot", () => {
    const robotsTxt = readFileSync(robotsTxtPath, "utf8");

    expect(robotsTxt).toContain("User-agent: GPTBot");
    expect(robotsTxt).toContain("User-agent: OAI-SearchBot");
    expect(robotsTxt).toContain("Sitemap: https://mathsheet.app/sitemap.xml");
  });

  it("lists the new landing pages in the sitemap", () => {
    const sitemapXml = readFileSync(sitemapXmlPath, "utf8");

    expect(sitemapXml).toContain("<loc>https://mathsheet.app/addition-worksheets</loc>");
    expect(sitemapXml).toContain("<loc>https://mathsheet.app/math-worksheets-with-answers</loc>");
    expect(sitemapXml).toContain("<loc>https://mathsheet.app/grade-3-math-worksheets</loc>");
  });
});
