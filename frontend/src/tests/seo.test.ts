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

  it("injects structured data and optional social image metadata", () => {
    applySeo({
      title: "Printable Addition Worksheets | MathSheets",
      description: "Create free printable addition worksheets with answer support.",
      canonicalPath: "/addition-worksheets",
      imagePath: "/social/addition-worksheets.png",
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Printable Addition Worksheets | MathSheets",
          url: "https://mathsheet.app/addition-worksheets"
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Can I create easier addition worksheets for beginners?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes."
              }
            }
          ]
        }
      ]
    });

    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(
      "https://mathsheet.app/social/addition-worksheets.png"
    );
    expect(document.head.querySelector('meta[name="twitter:image"]')?.getAttribute("content")).toBe(
      "https://mathsheet.app/social/addition-worksheets.png"
    );

    const schemaScripts = Array.from(document.head.querySelectorAll('script[type="application/ld+json"][data-seo-schema]'));
    expect(schemaScripts).toHaveLength(2);
    expect(schemaScripts[0].textContent).toContain('"@type":"WebPage"');
    expect(schemaScripts[1].textContent).toContain('"@type":"FAQPage"');
  });
});
