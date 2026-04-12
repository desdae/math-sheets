import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import WorksheetView from "../views/WorksheetView.vue";
import { useWorksheetStore } from "../stores/worksheet";

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: {
      id: "local-worksheet-1"
    }
  })
}));

const buildWorksheet = () => ({
  id: "local-worksheet-1",
  title: "Easy Practice",
  status: "partial" as const,
  config: {
    problemCount: 4,
    difficulty: "easy" as const,
    allowedOperations: ["+", "-"] as Array<"+" | "-" | "*" | "/">,
    numberRangeMin: 1,
    numberRangeMax: 10,
    worksheetSize: "medium" as const,
    cleanDivisionOnly: true
  },
  questions: [
    { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 3, displayText: "2 + 3 =", correctAnswer: 5 },
    { questionOrder: 2, operation: "-", leftOperand: 7, rightOperand: 1, displayText: "7 - 1 =", correctAnswer: 6 },
    { questionOrder: 3, operation: "+", leftOperand: 4, rightOperand: 4, displayText: "4 + 4 =", correctAnswer: 8 },
    { questionOrder: 4, operation: "-", leftOperand: 9, rightOperand: 2, displayText: "9 - 2 =", correctAnswer: 7 }
  ],
  answers: ["5", "", "9", null],
  source: "local" as const,
  localImportKey: "local-import-1",
  createdAt: new Date().toISOString(),
  result: undefined
});

describe("WorksheetView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [buildWorksheet()];
    worksheetStore.setActiveWorksheet(buildWorksheet());
  });

  it("shows unanswered count and does not show wrong-answer state before submit", async () => {
    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("2 unanswered");
    expect(wrapper.find('[data-testid="answer-state-2"]').attributes("data-answer-state")).toBe("empty");
    expect(wrapper.find('[data-testid="answer-state-3"]').attributes("data-answer-state")).toBe("filled");
  });

  it("warns and asks for confirmation before submitting with unanswered problems", async () => {
    const worksheetStore = useWorksheetStore();
    const submitSpy = vi.spyOn(worksheetStore, "submitActiveWorksheet").mockResolvedValue(null);
    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("2 problems are still empty");

    await wrapper.get('[data-testid="submit-worksheet-button"]').trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Submit with unanswered problems?");
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("disables inputs and exposes evaluated answer states after completion", async () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.setActiveWorksheet({
      ...buildWorksheet(),
      status: "completed",
      submittedAt: new Date().toISOString(),
      result: {
        scoreCorrect: 2,
        scoreTotal: 4,
        accuracyPercentage: 50
      }
    });

    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("Completed and locked");
    expect(wrapper.find('[data-testid="answer-state-1"]').attributes("data-answer-state")).toBe("correct");
    expect(wrapper.find('[data-testid="answer-state-3"]').attributes("data-answer-state")).toBe("wrong");
    expect(wrapper.find('[data-testid="answer-input-1"]').attributes("disabled")).toBeDefined();
  });

  it("applies the configured worksheet size to the grid layout", async () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.setActiveWorksheet({
      ...buildWorksheet(),
      config: {
        ...buildWorksheet().config,
        worksheetSize: "large"
      }
    });

    const wrapper = mount(WorksheetView);

    expect(wrapper.get('[data-testid="worksheet-grid"]').attributes("data-worksheet-size")).toBe("large");
  });
});
