import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnonymousWorksheetStore } from "../composables/useAnonymousWorksheets";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const apiFetchMock = vi.fn();

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

describe("anonymous worksheets", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    localStorage.clear();
  });

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

  it("preserves local worksheet timestamps when importing to a signed-in account", async () => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();

    authStore.user = {
      id: "user-1",
      displayName: "Test User",
      email: "test@example.com",
      avatarUrl: null
    };

    worksheetStore.anonymousWorksheets = [
      {
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
        createdAt: "2026-04-10T09:00:00.000Z",
        submittedAt: "2026-04-10T09:05:00.000Z",
        result: {
          scoreCorrect: 2,
          scoreTotal: 2,
          accuracyPercentage: 100
        }
      }
    ];

    apiFetchMock.mockResolvedValueOnce({ importedCount: 1, worksheets: [] });
    apiFetchMock.mockResolvedValueOnce([]);

    await worksheetStore.importAnonymousWorksheets();

    expect(apiFetchMock.mock.calls[0]?.[0]).toBe("/worksheets/import-local");
    expect(apiFetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      worksheets: [
        {
          createdAt: "2026-04-10T09:00:00.000Z",
          submittedAt: "2026-04-10T09:05:00.000Z"
        }
      ]
    });
  });
});
