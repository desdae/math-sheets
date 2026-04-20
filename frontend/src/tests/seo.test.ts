import { beforeEach, describe, expect, it } from "vitest";
import { applySeo } from "../lib/seo";

describe("SEO helpers", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
    window.history.replaceState({}, "", "/");
  });

  it("applies default head metadata", () => {
    applySeo();

    expect(document.title).toContain("MathSheets");
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toContain(
      "printable math worksheets"
    );
    expect(document.head.querySelector('meta[name="keywords"]')?.getAttribute("content")).toContain("math worksheets");
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe("https://mathsheet.app/");
  });

  it("applies route specific robots and canonical metadata", () => {
    applySeo({
      title: "Sign In | MathSheets",
      description: "Sign in to MathSheets.",
      robots: "noindex, nofollow",
      canonicalPath: "/login"
    });

    expect(document.title).toBe("Sign In | MathSheets");
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://mathsheet.app/login"
    );
  });
});
