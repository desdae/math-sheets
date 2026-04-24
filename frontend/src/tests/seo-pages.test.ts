import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { getSeoPageBySlug, seoPages } from "../content/seo-pages";
import LandingView from "../views/LandingView.vue";
import { routes } from "../router";

describe("SEO page definitions", () => {
  it("defines the expected 10 landing pages", () => {
    expect(seoPages.map((page) => page.slug)).toEqual([
      "printable-math-worksheets",
      "addition-worksheets",
      "subtraction-worksheets",
      "multiplication-worksheets",
      "division-worksheets",
      "mixed-operations-worksheets",
      "math-worksheets-with-answers",
      "grade-1-math-worksheets",
      "grade-2-math-worksheets",
      "grade-3-math-worksheets"
    ]);
  });

  it("gives every page the content required for a real landing page", () => {
    for (const page of seoPages) {
      expect(page.title).toMatch(/MathSheets$/);
      expect(page.description.length).toBeGreaterThan(80);
      expect(page.h1.length).toBeGreaterThan(10);
      expect(page.intro.length).toBeGreaterThanOrEqual(2);
      expect(page.examples.length).toBeGreaterThanOrEqual(3);
      expect(page.faqs.length).toBeGreaterThanOrEqual(2);
      expect(page.relatedSlugs.length).toBeGreaterThanOrEqual(2);
      expect(page.ctaLabel.toLowerCase()).toContain("worksheet");
    }
  });

  it("resolves related links and lookups by slug", () => {
    const page = getSeoPageBySlug("addition-worksheets");

    expect(page?.slug).toBe("addition-worksheets");
    expect(page?.relatedSlugs.every((slug) => Boolean(getSeoPageBySlug(slug)))).toBe(true);
  });

  it("registers a route for every shared SEO page", () => {
    const routePaths = routes.map((route) => route.path);

    expect(routePaths).toContain("/addition-worksheets");
    expect(routePaths).toContain("/mixed-operations-worksheets");
    expect(routePaths).toContain("/grade-3-math-worksheets");
  });

  it("stores the SEO page slug in route meta for schema generation", () => {
    const route = routes.find((entry) => entry.path === "/addition-worksheets");

    expect(route?.meta?.schemaSlug).toBe("addition-worksheets");
    expect(Array.isArray(route?.meta?.schema)).toBe(true);
  });

  it("links from the homepage into key worksheet topics", () => {
    const wrapper = mount(LandingView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.html()).toContain('href="/addition-worksheets"');
    expect(wrapper.html()).toContain('href="/multiplication-worksheets"');
    expect(wrapper.html()).toContain('href="/grade-1-math-worksheets"');
  });
});
