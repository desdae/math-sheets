export type Difficulty = "easy" | "medium" | "hard";
export type WorksheetSize = "small" | "medium" | "large";
export type Operation = "+" | "-" | "*" | "/";
export type WorksheetStatus = "draft" | "partial" | "completed";

export type WorksheetConfig = {
  problemCount: number;
  difficulty: Difficulty;
  allowedOperations: Operation[];
  numberRangeMin: number;
  numberRangeMax: number;
  worksheetSize: WorksheetSize;
  cleanDivisionOnly: boolean;
};

export type GeneratedQuestion = {
  id?: string;
  questionOrder: number;
  operation: Operation;
  leftOperand: number;
  rightOperand: number;
  displayText: string;
  correctAnswer: number;
};

export type GeneratedWorksheet = {
  title: string;
  config: WorksheetConfig;
  questions: GeneratedQuestion[];
};

export type WorksheetAnswerInput = {
  questionId: string;
  answerText: string;
};
