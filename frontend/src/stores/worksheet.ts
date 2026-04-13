import { defineStore } from "pinia";
import { anonymousImportDecisionKey, anonymousWorksheetsKey, createAnonymousWorksheetStore } from "../composables/useAnonymousWorksheets";
import { apiFetch } from "../lib/api";
import type { WorksheetSummaryRecord } from "../lib/saved-worksheets";
import { useAuthStore } from "./auth";

export type WorksheetConfig = {
  problemCount: number;
  difficulty: "easy" | "medium" | "hard";
  allowedOperations: Array<"+" | "-" | "*" | "/">;
  numberRangeMin: number;
  numberRangeMax: number;
  worksheetSize: "small" | "medium" | "large";
  cleanDivisionOnly: boolean;
};

export type WorksheetQuestion = {
  id?: string;
  questionOrder: number;
  operation: "+" | "-" | "*" | "/";
  leftOperand: number;
  rightOperand: number;
  displayText: string;
  correctAnswer: number;
};

export type WorksheetRecord = {
  id: string;
  title: string;
  status: "draft" | "partial" | "completed";
  config: WorksheetConfig;
  questions: WorksheetQuestion[];
  answers: Array<string | null>;
  source: "local" | "remote";
  localImportKey: string;
  createdAt: string;
  submittedAt?: string | null;
  elapsedSeconds: number;
  result?: {
    scoreCorrect: number;
    scoreTotal: number;
    accuracyPercentage: number;
  };
};

export type WorksheetSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const anonymousStore = createAnonymousWorksheetStore();
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const randomKey = () => `local-${crypto.randomUUID()}`;
const normalizeElapsedSeconds = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};
const normalizeWorksheetRecord = (record: WorksheetRecord): WorksheetRecord => ({
  ...record,
  elapsedSeconds: normalizeElapsedSeconds(record.elapsedSeconds)
});
const cloneWorksheetRecord = (record: WorksheetRecord): WorksheetRecord => JSON.parse(JSON.stringify(record)) as WorksheetRecord;
const buildLocalWorksheet = (payload: {
  title: string;
  config: WorksheetConfig;
  questions: WorksheetQuestion[];
}): WorksheetRecord => ({
  id: randomKey(),
  title: payload.title,
  status: "draft",
  config: payload.config,
  questions: payload.questions,
  answers: payload.questions.map(() => null),
  source: "local",
  localImportKey: randomKey(),
  createdAt: new Date().toISOString(),
  elapsedSeconds: 0
});
const buildRemoteWorksheetSummary = (record: WorksheetRecord): WorksheetSummaryRecord => ({
  id: record.id,
  title: record.title,
  status: record.status,
  difficulty: record.config.difficulty,
  problemCount: record.questions.length,
  allowedOperations: record.config.allowedOperations,
  numberRangeMin: record.config.numberRangeMin,
  numberRangeMax: record.config.numberRangeMax,
  worksheetSize: record.config.worksheetSize,
  cleanDivisionOnly: record.config.cleanDivisionOnly,
  source: "generated",
  createdAt: record.createdAt,
  submittedAt: record.submittedAt ?? null,
  elapsedSeconds: record.elapsedSeconds,
  result: record.result
});

export const useWorksheetStore = defineStore("worksheet", {
  state: () => ({
    anonymousWorksheets: anonymousStore.load<WorksheetRecord>().map((record) => normalizeWorksheetRecord(record)),
    remoteWorksheets: [] as WorksheetSummaryRecord[],
    activeWorksheet: null as WorksheetRecord | null,
    showImportModal: false,
    isLoading: false,
    saveState: "idle" as WorksheetSaveState,
    lastSavedAt: null as string | null
  }),
  getters: {
    hasImportableAnonymousWorksheets: (state) => state.anonymousWorksheets.length > 0
  },
  actions: {
    syncAnonymousStorage() {
      anonymousStore.save(this.anonymousWorksheets);
    },
    clearAutoSaveTimer() {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
    },
    markSaveQueued() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.saveState = "dirty";
    },
    async autoSaveActiveWorksheet() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.saveState = "saving";

      try {
        await this.saveProgress(this.activeWorksheet);
        this.lastSavedAt = new Date().toISOString();
        this.saveState = "saved";
      } catch {
        this.saveState = "error";
      }
    },
    queueAutoSave() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.markSaveQueued();
      this.clearAutoSaveTimer();
      autoSaveTimer = setTimeout(() => {
        void this.autoSaveActiveWorksheet();
      }, 500);
    },
    hydrateAnonymousWorksheets() {
      this.anonymousWorksheets = anonymousStore.load<WorksheetRecord>().map((record) => normalizeWorksheetRecord(record));
    },
    async generateWorksheet(config: WorksheetConfig) {
      const authStore = useAuthStore();
      const payload = await apiFetch<{ title: string; questions: WorksheetQuestion[]; config: WorksheetConfig }>(
        "/worksheets/generate",
        {
          method: "POST",
          body: JSON.stringify(config)
        }
      );

      const record = buildLocalWorksheet(payload);

      this.activeWorksheet = record;

      if (!authStore.user) {
        this.saveLocalWorksheet(record);
      }

      this.saveState = "saved";
      this.lastSavedAt = new Date().toISOString();

      return record;
    },
    saveLocalWorksheet(record: WorksheetRecord) {
      const existingIndex = this.anonymousWorksheets.findIndex((entry) => entry.id === record.id);

      if (existingIndex >= 0) {
        this.anonymousWorksheets.splice(existingIndex, 1, record);
      } else {
        this.anonymousWorksheets.unshift(record);
      }

      this.syncAnonymousStorage();
    },
    updateAnswer(index: number, value: string) {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.activeWorksheet.answers[index] = value;
      this.activeWorksheet.status = "partial";
      this.queueAutoSave();
    },
    tickActiveWorksheetTimer() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.activeWorksheet.elapsedSeconds = normalizeElapsedSeconds(this.activeWorksheet.elapsedSeconds) + 1;

      if (this.activeWorksheet.source === "local" && this.activeWorksheet.elapsedSeconds % 5 === 0) {
        this.saveLocalWorksheet(this.activeWorksheet);
      }
    },
    async flushActiveWorksheetProgress() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      const authStore = useAuthStore();

      if (!authStore.user || this.activeWorksheet.source === "local") {
        this.saveLocalWorksheet(this.activeWorksheet);
        return;
      }

      await this.saveProgress(this.activeWorksheet);
    },
    setActiveWorksheet(record: WorksheetRecord | null) {
      this.clearAutoSaveTimer();
      this.activeWorksheet = record ? normalizeWorksheetRecord(cloneWorksheetRecord(record)) : null;
      this.saveState = record ? (record.status === "completed" ? "idle" : "saved") : "idle";
      this.lastSavedAt = null;
    },
    async persistSignedInWorksheet(record: WorksheetRecord) {
      const payload = await apiFetch<{
        worksheet: { id: string; status: "draft" | "partial" | "completed" };
        questions: WorksheetQuestion[];
      }>("/worksheets", {
        method: "POST",
        body: JSON.stringify(record.config)
      });

      this.activeWorksheet = {
        ...record,
        id: payload.worksheet.id,
        status: payload.worksheet.status,
        source: "remote",
        questions: payload.questions,
        elapsedSeconds: Number(payload.worksheet.elapsedSeconds ?? record.elapsedSeconds ?? 0)
      };
      const summary = buildRemoteWorksheetSummary(this.activeWorksheet);
      const existingIndex = this.remoteWorksheets.findIndex((entry) => String(entry.id) === String(summary.id));

      if (existingIndex >= 0) {
        this.remoteWorksheets.splice(existingIndex, 1, summary);
      } else {
        this.remoteWorksheets.unshift(summary);
      }

      this.saveState = "saved";
      this.lastSavedAt = new Date().toISOString();

      return this.activeWorksheet;
    },
    async saveProgress(record: WorksheetRecord) {
      const authStore = useAuthStore();

      if (record.status === "completed") {
        return record;
      }

      if (!authStore.user || record.source === "local") {
        this.saveLocalWorksheet(record);
        return record;
      }

      await apiFetch(`/worksheets/${record.id}/save`, {
        method: "PATCH",
        body: JSON.stringify({
          answers: record.questions.map((question, index) => ({
            questionId: question.id,
            answerText: record.answers[index] ?? ""
          })),
          elapsedSeconds: record.elapsedSeconds,
          status: record.status === "draft" ? "draft" : "partial"
        })
      });

      const existingIndex = this.remoteWorksheets.findIndex((entry) => String(entry.id) === String(record.id));
      if (existingIndex >= 0) {
        this.remoteWorksheets.splice(existingIndex, 1, buildRemoteWorksheetSummary(record));
      }

      return record;
    },
    async submitActiveWorksheet() {
      const authStore = useAuthStore();

      if (!this.activeWorksheet) {
        return null;
      }

      if (!authStore.user) {
        const scoreCorrect = this.activeWorksheet.questions.filter(
          (question, index) => Number(this.activeWorksheet?.answers[index] ?? "") === question.correctAnswer
        ).length;
        const scoreTotal = this.activeWorksheet.questions.length;

        this.activeWorksheet.status = "completed";
        this.activeWorksheet.submittedAt = new Date().toISOString();
        this.activeWorksheet.result = {
          scoreCorrect,
          scoreTotal,
          accuracyPercentage: Number(((scoreCorrect / scoreTotal) * 100).toFixed(2))
        };
        this.clearAutoSaveTimer();
        this.saveState = "idle";
        this.lastSavedAt = this.activeWorksheet.submittedAt;
        this.saveLocalWorksheet(this.activeWorksheet);
        return this.activeWorksheet.result;
      }

      const result = await apiFetch<{
        scoreCorrect: number;
        scoreTotal: number;
        accuracyPercentage: number;
        elapsedSeconds: number;
      }>(`/worksheets/${this.activeWorksheet.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: this.activeWorksheet.answers,
          elapsedSeconds: this.activeWorksheet.elapsedSeconds
        })
      });

      this.activeWorksheet.status = "completed";
      this.activeWorksheet.submittedAt = new Date().toISOString();
      this.activeWorksheet.elapsedSeconds = result.elapsedSeconds;
      this.activeWorksheet.result = result;
      this.clearAutoSaveTimer();
      this.saveState = "idle";
      this.lastSavedAt = this.activeWorksheet.submittedAt;
      const existingIndex = this.remoteWorksheets.findIndex((entry) => String(entry.id) === String(this.activeWorksheet?.id));
      if (existingIndex >= 0) {
        this.remoteWorksheets.splice(existingIndex, 1, buildRemoteWorksheetSummary(this.activeWorksheet));
      }
      return result;
    },
    async fetchRemoteWorksheets() {
      const authStore = useAuthStore();

      if (!authStore.user) {
        this.remoteWorksheets = [];
        return;
      }

      this.remoteWorksheets = await apiFetch<WorksheetSummaryRecord[]>("/worksheets");
    },
    async maybePromptForImport() {
      const authStore = useAuthStore();
      const previousDecision = localStorage.getItem(anonymousImportDecisionKey);

      this.showImportModal = Boolean(authStore.user && this.hasImportableAnonymousWorksheets && !previousDecision);
    },
    rememberImportDecision(decision: "confirmed" | "declined") {
      localStorage.setItem(anonymousImportDecisionKey, decision);
      this.showImportModal = false;
    },
    async importAnonymousWorksheets() {
      const authStore = useAuthStore();

      if (!authStore.user || this.anonymousWorksheets.length === 0) {
        return;
      }

      await apiFetch("/worksheets/import-local", {
        method: "POST",
        body: JSON.stringify({
          worksheets: this.anonymousWorksheets.map((worksheet) => ({
            localImportKey: worksheet.localImportKey,
            title: worksheet.title,
            status: worksheet.status,
            config: worksheet.config,
            questions: worksheet.questions,
            answers: worksheet.answers,
            createdAt: worksheet.createdAt,
            elapsedSeconds: worksheet.elapsedSeconds,
            submittedAt: worksheet.submittedAt ?? null
          }))
        })
      });

      this.anonymousWorksheets = [];
      this.syncAnonymousStorage();
      this.rememberImportDecision("confirmed");
      await this.fetchRemoteWorksheets();
    }
  }
});
