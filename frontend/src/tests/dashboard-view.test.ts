import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardView from "../views/DashboardView.vue";
import { useWorksheetStore } from "../stores/worksheet";

const apiFetchMock = vi.fn();

vi.mock("vue-router", () => ({
  RouterLink: {
    name: "RouterLink",
    props: ["to"],
    template: '<a :href="to"><slot /></a>'
  }
}));

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  setStoredToken: vi.fn(),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

const buildLocalWorksheet = () => ({
  id: "local-worksheet-1",
  title: "Easy Practice",
  status: "partial" as const,
  config: {
    problemCount: 12,
    difficulty: "easy" as const,
    allowedOperations: ["+"] as Array<"+" | "-" | "*" | "/">,
    numberRangeMin: 1,
    numberRangeMax: 10,
    worksheetSize: "medium" as const,
    cleanDivisionOnly: true
  },
  questions: [
    { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 3, displayText: "2 + 3 =", correctAnswer: 5 }
  ],
  answers: [""],
  source: "local" as const,
  localImportKey: "local-import-1",
  createdAt: "2026-04-13T09:00:00.000Z"
});

describe("DashboardView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiFetchMock.mockReset();
  });

  it("prioritizes resume when unfinished work exists", async () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [buildLocalWorksheet()];

    const wrapper = mount(DashboardView);
    await flushPromises();

    expect(wrapper.text()).toContain("Continue practicing");
    expect(wrapper.text()).toContain("Resume worksheet");
    expect(wrapper.html()).toContain('/worksheets/local-worksheet-1');
  });

  it("falls back to creating a new worksheet when there is no unfinished work", async () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [];
    worksheetStore.remoteWorksheets = [];

    const wrapper = mount(DashboardView);
    await flushPromises();

    expect(wrapper.text()).toContain("Start fresh");
    expect(wrapper.text()).toContain("New worksheet");
    expect(wrapper.html()).toContain('/generate');
  });
});
