import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SeoLandingPageView from "../views/SeoLandingPageView.vue";

describe("SEO landing page view", () => {
  it("renders intro copy, example problems, faq items, related links, and generator CTA", () => {
    const wrapper = mount(SeoLandingPageView, {
      props: { slug: "addition-worksheets" },
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.get("h1").text().toLowerCase()).toContain("addition worksheets");
    expect(wrapper.text()).toContain("7 + 5 =");
    expect(wrapper.text()).toContain("Best for");
    expect(wrapper.text()).toContain("Can I create easier addition worksheets for beginners?");
    expect(wrapper.text()).toContain("Create an addition worksheet");
    expect(wrapper.html()).toContain('href="/generate"');
    expect(wrapper.html()).toContain('href="/subtraction-worksheets"');
  });
});
