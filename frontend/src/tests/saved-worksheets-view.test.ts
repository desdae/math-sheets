import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWorksheetChips,
  buildWorksheetDateGroups,
  filterWorksheetRecords,
  type WorksheetSummaryRecord
} from "../lib/saved-worksheets";
import SavedWorksheetRow from "../components/worksheet/SavedWorksheetRow.vue";
import SavedWorksheetsView from "../views/SavedWorksheetsView.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const push = vi.fn();

vi.mock("vue-router", () => ({
  RouterLink: {
    name: "RouterLink",
    props: ["to"],
    template: '<a :href="to"><slot /></a>'
  },
  useRouter: () => ({
    push
  })
}));

const now = new Date("2026-04-13T10:00:00.000Z");

const records: WorksheetSummaryRecord[] = [
  {
    id: "today-1",
    title: "Mixed Sprint",
    status: "completed",
    difficulty: "medium",
    problemCount: 12,
    allowedOperations: ["+", "/"],
    numberRangeMin: 1,
    numberRangeMax: 100,
    worksheetSize: "medium",
    createdAt: "2026-04-13T08:15:00.000Z",
    submittedAt: "2026-04-13T08:25:00.000Z",
    result: { scoreCorrect: 11, scoreTotal: 12, accuracyPercentage: 91.67 }
  },
  {
    id: "week-1",
    title: "Subtraction Builder",
    status: "partial",
    difficulty: "easy",
    problemCount: 16,
    allowedOperations: ["-"],
    numberRangeMin: 1,
    numberRangeMax: 20,
    worksheetSize: "small",
    createdAt: "2026-04-10T09:00:00.000Z"
  },
  {
    id: "earlier-1",
    title: "Hard Tables",
    status: "completed",
    difficulty: "hard",
    problemCount: 20,
    allowedOperations: ["*"],
    numberRangeMin: 1,
    numberRangeMax: 12,
    worksheetSize: "large",
    createdAt: "2026-04-01T09:00:00.000Z",
    submittedAt: "2026-04-01T09:18:00.000Z"
  }
];

const localWorksheet = {
  id: "local-1",
  title: "Local Builder",
  status: "partial" as const,
  config: {
    problemCount: 10,
    difficulty: "easy" as const,
    allowedOperations: ["+"] as Array<"+" | "-" | "*" | "/">,
    numberRangeMin: 1,
    numberRangeMax: 10,
    worksheetSize: "small" as const,
    cleanDivisionOnly: true
  },
  questions: [
    { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 3, displayText: "2 + 3 =", correctAnswer: 5 }
  ],
  answers: [""],
  source: "local" as const,
  localImportKey: "local-import-1",
  createdAt: "2026-04-13T09:00:00.000Z"
};

const createWrapper = () => mount(SavedWorksheetsView);

beforeEach(() => {
  push.mockReset();
  setActivePinia(createPinia());

  const authStore = useAuthStore();
  const worksheetStore = useWorksheetStore();

  authStore.user = null;
  worksheetStore.anonymousWorksheets = [localWorksheet];
  worksheetStore.remoteWorksheets = records;
});

describe("saved-worksheets helpers", () => {
  it("groups synced worksheets into today, this week, and earlier", () => {
    const groups = buildWorksheetDateGroups(records, now);

    expect(groups[0].label).toBe("Today");
    expect(groups[0].items.map((item) => item.id)).toEqual(["today-1"]);
    expect(groups[1].label).toBe("This week");
    expect(groups[1].items.map((item) => item.id)).toEqual(["week-1"]);
    expect(groups[2].label).toBe("Earlier");
    expect(groups[2].items.map((item) => item.id)).toEqual(["earlier-1"]);
  });

  it("builds separate chips for each operation and worksheet facet", () => {
    const chips = buildWorksheetChips(records[0]);

    expect(chips.map((chip) => chip.value)).toContain("completed");
    expect(chips.map((chip) => chip.value)).toContain("medium");
    expect(chips.map((chip) => chip.value)).toContain("addition");
    expect(chips.map((chip) => chip.value)).toContain("division");
    expect(chips.map((chip) => chip.value)).toContain("1-100");
    expect(chips.find((chip) => chip.kind === "size")?.label).toBe("medium sheet");
  });

  it("applies multi-select filters across status, difficulty, and operation", () => {
    const filtered = filterWorksheetRecords(records, new Set(["completed", "medium", "addition"]));
    expect(filtered.map((item) => item.id)).toEqual(["today-1"]);
  });
});

describe("SavedWorksheetsView", () => {
  it("shows synced worksheets grouped into today, this week, and earlier", () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain("Today");
    expect(wrapper.text()).toContain("This week");
    expect(wrapper.text()).toContain("Earlier");
  });

  it("renders worksheet metadata chips and score badges for completed rows", () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain("91.67%");
    expect(wrapper.text()).toContain("completed");
    expect(wrapper.text()).toContain("medium");
    expect(wrapper.text()).toContain("addition");
  });

  it("toggles a chip filter without navigating", async () => {
    const wrapper = createWrapper();

    await wrapper.get('[data-testid="worksheet-chip-addition"]').trigger("click");

    expect(push).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="active-filter-addition"]').exists()).toBe(true);
  });

  it("hides the local section entirely when there are no local worksheets", () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [];

    const wrapper = createWrapper();

    expect(wrapper.text()).not.toContain("Local on this device");
  });

  it("shows the import action only when signed in and local worksheets exist", () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: "user-1",
      displayName: "Test User",
      email: "test@example.com",
      avatarUrl: null
    };

    const wrapper = createWrapper();

    expect(wrapper.text()).toContain("Import new local worksheets");
  });

  it("shows a filtered empty state and clears filters", async () => {
    const wrapper = createWrapper();
    const multiplicationChip = wrapper.get('[data-testid="worksheet-chip-multiplication"]');

    await multiplicationChip.trigger("click");
    await wrapper.findComponent(SavedWorksheetRow).vm.$emit("toggle-filter", "addition");

    expect(wrapper.text()).toContain("No worksheets match these filters");

    await wrapper.get('[data-testid="clear-all-empty-filters"]').trigger("click");

    expect(wrapper.text()).toContain("Today");
    expect(wrapper.find('[data-testid="active-filter-multiplication"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="active-filter-addition"]').exists()).toBe(false);
  });

  it("applies active filters to local worksheets too", async () => {
    const wrapper = createWrapper();
    const hardChip = wrapper.get('[data-testid="worksheet-chip-hard"]');
    const additionChip = wrapper.get('[data-testid="worksheet-chip-addition"]');

    await hardChip.trigger("click");
    await additionChip.trigger("click");

    expect(wrapper.text()).not.toContain("Local Builder");
    expect(wrapper.text()).not.toContain("Unsynced progress");
  });
});
