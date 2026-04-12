import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { createAnonymousWorksheetStore } from "../composables/useAnonymousWorksheets";
import { useWorksheetStore } from "../stores/worksheet";

describe("anonymous worksheets", () => {
  it("persists local worksheets", () => {
    const store = createAnonymousWorksheetStore("test-key");
    store.save([{ id: "local-1", title: "Easy Practice" }]);
    expect(store.load()).toHaveLength(1);
    store.clear();
  });

  it("does not allow completed worksheets to be edited", () => {
    setActivePinia(createPinia());
    const worksheetStore = useWorksheetStore();

    worksheetStore.activeWorksheet = {
      id: "local-1",
      title: "Easy Practice",
      status: "completed",
      config: {
        problemCount: 2,
        difficulty: "easy",
        allowedOperations: ["+"],
        numberRangeMin: 1,
        numberRangeMax: 10,
        worksheetSize: "small",
        cleanDivisionOnly: true
      },
      questions: [
        { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 2, displayText: "2 + 2 =", correctAnswer: 4 },
        { questionOrder: 2, operation: "+", leftOperand: 3, rightOperand: 1, displayText: "3 + 1 =", correctAnswer: 4 }
      ],
      answers: ["4", "4"],
      source: "local",
      localImportKey: "import-key",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      result: {
        scoreCorrect: 2,
        scoreTotal: 2,
        accuracyPercentage: 100
      }
    };

    worksheetStore.updateAnswer(0, "999");

    expect(worksheetStore.activeWorksheet.answers[0]).toBe("4");
  });
});
