import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import WorksheetView from "../views/WorksheetView.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

let routeWorksheetId = "local-worksheet-1";

vi.mock("vue-router", () => ({
  RouterLink: {
    name: "RouterLink",
    props: ["to"],
    template: '<a :href="to"><slot /></a>'
  },
  useRoute: () => ({
    params: {
      id: routeWorksheetId
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
  elapsedSeconds: 0,
  result: undefined
});

describe("WorksheetView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routeWorksheetId = "local-worksheet-1";
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [buildWorksheet()];
    worksheetStore.setActiveWorksheet(buildWorksheet());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows unanswered count and does not show wrong-answer state before submit", async () => {
    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("2 unanswered");
    expect(wrapper.text()).toContain("2 of 4 answered");
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
      elapsedSeconds: 242,
      result: {
        scoreCorrect: 2,
        scoreTotal: 4,
        accuracyPercentage: 50
      }
    });

    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("Completed and locked");
    expect(wrapper.get('[data-testid="worksheet-live-timer"]').text()).toContain("Completed in: 04:02");
    expect(wrapper.text()).toContain("Completed and locked in 04:02");
    expect(wrapper.find('[data-testid="answer-state-1"]').attributes("data-answer-state")).toBe("correct");
    expect(wrapper.find('[data-testid="answer-state-3"]').attributes("data-answer-state")).toBe("wrong");
    expect(wrapper.find('[data-testid="answer-input-1"]').attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Generate another");
    expect(wrapper.text()).toContain("Back to library");
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

  it("starts a live timer immediately after the worksheet loads", async () => {
    vi.useFakeTimers();
    const wrapper = mount(WorksheetView);

    expect(wrapper.get('[data-testid="worksheet-live-timer"]').text()).toContain("Time: 00:00");

    vi.advanceTimersByTime(3000);
    await nextTick();

    expect(wrapper.get('[data-testid="worksheet-live-timer"]').text()).toContain("Time: 00:03");
  });

  it("renders each answer as a compact row with a shared layout hook for mobile", () => {
    const wrapper = mount(WorksheetView);

    expect(wrapper.find('[data-testid="answer-row-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="answer-row-1"]').find("label").text()).toBe("2 + 3 =");
    expect(wrapper.find('[data-testid="answer-row-1"]').find("input").exists()).toBe(true);
  });

  it("loads a remote worksheet after auth finishes restoring on a refreshed deep link", async () => {
    routeWorksheetId = "remote-worksheet-1";
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [];
    worksheetStore.setActiveWorksheet(null);
    authStore.user = null;
    authStore.setAccessToken("restored-token");
    authStore.hasCheckedAuth = false;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        worksheet: {
          id: "remote-worksheet-1",
          title: "Recovered Remote Worksheet",
          status: "partial",
          problemCount: 2,
          difficulty: "medium",
          allowedOperations: ["+"],
          numberRangeMin: 1,
          numberRangeMax: 20,
          worksheetSize: "small",
          cleanDivisionOnly: true,
          createdAt: "2026-04-19T12:00:00.000Z",
          submittedAt: null,
          elapsedSeconds: 18,
          result: undefined
        },
        questions: [
          { id: "q1", questionOrder: 1, operation: "+", leftOperand: 8, rightOperand: 4, displayText: "8 + 4 =", correctAnswer: 12 },
          { id: "q2", questionOrder: 2, operation: "+", leftOperand: 9, rightOperand: 3, displayText: "9 + 3 =", correctAnswer: 12 }
        ],
        answers: [{ questionOrder: 1, answerText: "12", isCorrect: null }]
      })
    } as Response);

    mount(WorksheetView);

    expect(fetchSpy).not.toHaveBeenCalled();

    authStore.user = {
      id: "user-1",
      email: "student@example.com",
      publicNickname: "Student"
    };
    authStore.hasCheckedAuth = true;

    await nextTick();
    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(worksheetStore.activeWorksheet?.id).toBe("remote-worksheet-1");
    });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe("http://localhost:3000/api/worksheets/remote-worksheet-1");
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
      credentials: "include"
    });
    expect((fetchSpy.mock.calls[0]?.[1] as RequestInit).headers).toBeInstanceOf(Headers);
    expect(((fetchSpy.mock.calls[0]?.[1] as RequestInit).headers as Headers).get("Authorization")).toBe(
      "Bearer restored-token"
    );
    expect(worksheetStore.activeWorksheet?.title).toBe("Recovered Remote Worksheet");
    expect(worksheetStore.activeWorksheet?.answers).toEqual(["12", null]);
  });
});
