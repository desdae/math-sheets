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
    vi.useRealTimers();
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
      saveRevision: 0,
      elapsedSeconds: 125,
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

  it("normalizes missing elapsed time from older local worksheets", () => {
    localStorage.setItem(
      "mathsheets.anonymous.worksheets",
      JSON.stringify([
        {
          id: "legacy-local-1",
          title: "Legacy Worksheet",
          status: "partial",
          config: {
            problemCount: 1,
            difficulty: "easy",
            allowedOperations: ["+"],
            numberRangeMin: 1,
            numberRangeMax: 10,
            worksheetSize: "small",
            cleanDivisionOnly: true
          },
          questions: [
            { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 2, displayText: "2 + 2 =", correctAnswer: 4 }
          ],
          answers: [null],
          source: "local",
          localImportKey: "legacy-import-key",
          createdAt: new Date().toISOString(),
          saveRevision: 0
        }
      ])
    );

    setActivePinia(createPinia());
    const worksheetStore = useWorksheetStore();

    worksheetStore.hydrateAnonymousWorksheets();
    worksheetStore.setActiveWorksheet(worksheetStore.anonymousWorksheets[0]);
    worksheetStore.tickActiveWorksheetTimer();

    expect(worksheetStore.activeWorksheet?.elapsedSeconds).toBe(1);
  });

  it("preserves local worksheet timestamps when importing to a signed-in account", async () => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();

    authStore.user = {
      id: "user-1",
      email: "test@example.com",
      publicNickname: "Test User"
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
      saveRevision: 0,
      elapsedSeconds: 305,
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
          elapsedSeconds: 305,
          submittedAt: "2026-04-10T09:05:00.000Z"
        }
      ]
    });
  });

  it("sends elapsed seconds when saving a signed-in worksheet", async () => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();

    authStore.user = {
      id: "user-1",
      email: "test@example.com",
      publicNickname: "Test User"
    };

    apiFetchMock.mockResolvedValue(undefined);

    await worksheetStore.saveProgress({
      id: "remote-1",
      title: "Timed Worksheet",
      status: "partial",
      config: {
        problemCount: 1,
        difficulty: "easy",
        allowedOperations: ["+"],
        numberRangeMin: 1,
        numberRangeMax: 10,
        worksheetSize: "small",
        cleanDivisionOnly: true
      },
      questions: [
        {
          id: "question-1",
          questionOrder: 1,
          operation: "+",
          leftOperand: 2,
          rightOperand: 2,
          displayText: "2 + 2 =",
          correctAnswer: 4
        }
      ],
      answers: ["4"],
      source: "remote",
      localImportKey: "remote-1",
      createdAt: "2026-04-10T09:00:00.000Z",
      saveRevision: 0,
      elapsedSeconds: 125
    });

    expect(JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      elapsedSeconds: 125
    });
  });

  it("increments a save revision on each signed-in worksheet save", async () => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();

    authStore.user = {
      id: "user-1",
      email: "test@example.com",
      publicNickname: "Test User"
    };

    apiFetchMock.mockResolvedValue(undefined);

    const worksheet = {
      id: "remote-1",
      title: "Timed Worksheet",
      status: "partial" as const,
      config: {
        problemCount: 1,
        difficulty: "easy" as const,
        allowedOperations: ["+"] as Array<"+" | "-" | "*" | "/">,
        numberRangeMin: 1,
        numberRangeMax: 10,
        worksheetSize: "small" as const,
        cleanDivisionOnly: true
      },
      questions: [
        {
          id: "question-1",
          questionOrder: 1,
          operation: "+" as const,
          leftOperand: 2,
          rightOperand: 2,
          displayText: "2 + 2 =",
          correctAnswer: 4
        }
      ],
      answers: ["4"],
      source: "remote" as const,
      localImportKey: "remote-1",
      createdAt: "2026-04-10T09:00:00.000Z",
      saveRevision: 0,
      elapsedSeconds: 125
    };

    await worksheetStore.saveProgress(worksheet);
    await worksheetStore.saveProgress(worksheet);

    expect(JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      saveRevision: 1
    });
    expect(JSON.parse(String(apiFetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      saveRevision: 2
    });
  });

  it("uses a keepalive request when flushing remote progress during unload", async () => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();

    authStore.user = {
      id: "user-1",
      email: "test@example.com",
      publicNickname: "Test User"
    };

    worksheetStore.activeWorksheet = {
      id: "remote-1",
      title: "Timed Worksheet",
      status: "partial",
      config: {
        problemCount: 1,
        difficulty: "easy",
        allowedOperations: ["+"],
        numberRangeMin: 1,
        numberRangeMax: 10,
        worksheetSize: "small",
        cleanDivisionOnly: true
      },
      questions: [
        {
          id: "question-1",
          questionOrder: 1,
          operation: "+",
          leftOperand: 2,
          rightOperand: 2,
          displayText: "2 + 2 =",
          correctAnswer: 4
        }
      ],
      answers: ["4"],
      source: "remote",
      localImportKey: "remote-1",
      createdAt: "2026-04-10T09:00:00.000Z",
      saveRevision: 0,
      elapsedSeconds: 125
    };

    apiFetchMock.mockResolvedValue(undefined);

    await worksheetStore.flushActiveWorksheetProgress();

    expect(apiFetchMock.mock.calls[0]?.[0]).toBe("/worksheets/remote-1/save");
    expect(apiFetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "PATCH",
      keepalive: true
    });
  });

  it("does not postpone autosave indefinitely while the user keeps typing", async () => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();

    authStore.user = {
      id: "user-1",
      email: "test@example.com",
      publicNickname: "Test User"
    };

    worksheetStore.activeWorksheet = {
      id: "remote-1",
      title: "Timed Worksheet",
      status: "partial",
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
        {
          id: "question-1",
          questionOrder: 1,
          operation: "+",
          leftOperand: 2,
          rightOperand: 2,
          displayText: "2 + 2 =",
          correctAnswer: 4
        },
        {
          id: "question-2",
          questionOrder: 2,
          operation: "+",
          leftOperand: 3,
          rightOperand: 1,
          displayText: "3 + 1 =",
          correctAnswer: 4
        }
      ],
      answers: ["", ""],
      source: "remote",
      localImportKey: "remote-1",
      createdAt: "2026-04-10T09:00:00.000Z",
      saveRevision: 0,
      elapsedSeconds: 0
    };

    apiFetchMock.mockResolvedValue(undefined);

    worksheetStore.updateAnswer(0, "4");
    vi.advanceTimersByTime(400);
    worksheetStore.updateAnswer(1, "4");
    vi.advanceTimersByTime(200);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock.mock.calls[0]?.[0]).toBe("/worksheets/remote-1/save");
  });
});
