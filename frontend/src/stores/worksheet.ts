import { defineStore } from "pinia";
import { anonymousImportDecisionKey, anonymousWorksheetsKey, createAnonymousWorksheetStore } from "../composables/useAnonymousWorksheets";
import { apiFetch } from "../lib/api";
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
  result?: {
    scoreCorrect: number;
    scoreTotal: number;
    accuracyPercentage: number;
  };
};

const anonymousStore = createAnonymousWorksheetStore();

const randomKey = () => `local-${crypto.randomUUID()}`;
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
  createdAt: new Date().toISOString()
});
const buildRemoteWorksheetSummary = (record: WorksheetRecord) => ({
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
  submittedAt: record.submittedAt ?? null
});

export const useWorksheetStore = defineStore("worksheet", {
  state: () => ({
    anonymousWorksheets: anonymousStore.load<WorksheetRecord>(),
    remoteWorksheets: [] as Array<Record<string, unknown>>,
    activeWorksheet: null as WorksheetRecord | null,
    showImportModal: false,
    isLoading: false
  }),
  actions: {
    syncAnonymousStorage() {
      anonymousStore.save(this.anonymousWorksheets);
    },
    hydrateAnonymousWorksheets() {
      this.anonymousWorksheets = anonymousStore.load<WorksheetRecord>();
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
      if (!this.activeWorksheet) {
        return;
      }

      this.activeWorksheet.answers[index] = value;
      this.activeWorksheet.status = "partial";
    },
    setActiveWorksheet(record: WorksheetRecord | null) {
      this.activeWorksheet = record ? cloneWorksheetRecord(record) : null;
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
        questions: payload.questions
      };
      const summary = buildRemoteWorksheetSummary(this.activeWorksheet);
      const existingIndex = this.remoteWorksheets.findIndex((entry) => String(entry.id) === String(summary.id));

      if (existingIndex >= 0) {
        this.remoteWorksheets.splice(existingIndex, 1, summary);
      } else {
        this.remoteWorksheets.unshift(summary);
      }

      return this.activeWorksheet;
    },
    async saveProgress(record: WorksheetRecord) {
      const authStore = useAuthStore();

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
          elapsedSeconds: 0,
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
        this.saveLocalWorksheet(this.activeWorksheet);
        return this.activeWorksheet.result;
      }

      const result = await apiFetch<{
        scoreCorrect: number;
        scoreTotal: number;
        accuracyPercentage: number;
      }>(`/worksheets/${this.activeWorksheet.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: this.activeWorksheet.answers })
      });

      this.activeWorksheet.status = "completed";
      this.activeWorksheet.submittedAt = new Date().toISOString();
      this.activeWorksheet.result = result;
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

      this.remoteWorksheets = await apiFetch("/worksheets");
    },
    async maybePromptForImport() {
      const authStore = useAuthStore();
      const previousDecision = localStorage.getItem(anonymousImportDecisionKey);

      this.showImportModal = Boolean(authStore.user && this.anonymousWorksheets.length > 0 && !previousDecision);
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
            answers: worksheet.answers
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
