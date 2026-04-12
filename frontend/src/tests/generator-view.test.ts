import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia } from "pinia";
import { describe, expect, it } from "vitest";
import App from "../App.vue";
import GeneratorForm from "../components/worksheet/GeneratorForm.vue";
import { routes } from "../router";

describe("router", () => {
  it("renders the landing page", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes
    });

    router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()]
      }
    });

    expect(wrapper.text()).toContain("Printable math practice");
  });
});

describe("GeneratorForm", () => {
  it("emits a generate event with form data", async () => {
    const wrapper = mount(GeneratorForm);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("generate")).toBeTruthy();
  });

  it("renders stable test ids for the generator form", async () => {
    const wrapper = mount(GeneratorForm);

    expect(wrapper.find('[data-testid="generator-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="generate-submit"]').exists()).toBe(true);
  });
});
