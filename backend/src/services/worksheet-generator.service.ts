import { HttpError } from "../lib/http-error.js";
import type { GeneratedQuestion, GeneratedWorksheet, Operation, WorksheetConfig } from "../types/worksheet.js";

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(items: T[]) => items[randomInt(0, items.length - 1)];

const buildDifficultyRange = (config: WorksheetConfig) => {
  if (config.difficulty === "easy") {
    return {
      min: config.numberRangeMin,
      max: Math.min(config.numberRangeMax, Math.max(config.numberRangeMin + 9, config.numberRangeMin))
    };
  }

  if (config.difficulty === "medium") {
    return {
      min: config.numberRangeMin,
      max: Math.min(config.numberRangeMax, Math.max(config.numberRangeMin + 24, config.numberRangeMin))
    };
  }

  return {
    min: config.numberRangeMin,
    max: config.numberRangeMax
  };
};

const buildOperationPool = (config: WorksheetConfig) => {
  const weights: Record<WorksheetConfig["difficulty"], Operation[]> = {
    easy: ["+", "+", "+", "-", "-", "*", "/"],
    medium: ["+", "-", "*", "/"],
    hard: ["+", "-", "*", "*", "/", "/"]
  };

  const weighted = weights[config.difficulty].filter((operation) => config.allowedOperations.includes(operation));

  return weighted.length > 0 ? weighted : config.allowedOperations;
};

const pickOperation = (config: WorksheetConfig) => {
  if (config.allowedOperations.length === 1) {
    return config.allowedOperations[0];
  }

  return pick(buildOperationPool(config));
};

const canonicalProblemKey = (question: Pick<GeneratedQuestion, "operation" | "leftOperand" | "rightOperand">) => {
  if (question.operation === "+" || question.operation === "*") {
    const [low, high] = [question.leftOperand, question.rightOperand].sort((a, b) => a - b);
    return `${low}|${question.operation}|${high}`;
  }

  return `${question.leftOperand}|${question.operation}|${question.rightOperand}`;
};

const createQuestion = (operation: Operation, index: number, config: WorksheetConfig): GeneratedQuestion => {
  const range = buildDifficultyRange(config);
  let leftOperand = randomInt(range.min, range.max);
  let rightOperand = randomInt(range.min || 1, Math.max(range.max, 1));

  if (operation === "-" && config.difficulty !== "hard" && leftOperand < rightOperand) {
    [leftOperand, rightOperand] = [rightOperand, leftOperand];
  }

  if (operation === "*") {
    const multiplierCap = config.difficulty === "hard" ? 20 : config.difficulty === "medium" ? 12 : 5;
    leftOperand = randomInt(Math.max(1, range.min), Math.min(range.max, multiplierCap));
    rightOperand = randomInt(Math.max(1, range.min), Math.min(range.max, multiplierCap));
  }

  if (operation === "/") {
    if (config.cleanDivisionOnly) {
      const divisorCap = config.difficulty === "hard" ? 12 : config.difficulty === "medium" ? 10 : 5;
      rightOperand = randomInt(1, Math.max(1, Math.min(range.max, divisorCap)));
      const quotientCap =
        config.difficulty === "hard"
          ? Math.max(1, Math.floor(Math.max(range.max, 1) / rightOperand))
          : config.difficulty === "medium"
            ? Math.min(12, Math.max(1, Math.floor(Math.max(range.max, 1) / rightOperand)))
            : Math.min(10, Math.max(1, Math.floor(Math.max(range.max, 1) / rightOperand)));
      const answer = randomInt(1, Math.max(1, quotientCap));
      leftOperand = answer * rightOperand;
    } else if (rightOperand === 0) {
      rightOperand = 1;
    }
  }

  const correctAnswer =
    operation === "+"
      ? leftOperand + rightOperand
      : operation === "-"
        ? leftOperand - rightOperand
        : operation === "*"
          ? leftOperand * rightOperand
          : leftOperand / rightOperand;

  return {
    questionOrder: index + 1,
    operation,
    leftOperand,
    rightOperand,
    displayText: `${leftOperand} ${operation} ${rightOperand} =`,
    correctAnswer
  };
};

export const generateWorksheet = (config: WorksheetConfig): GeneratedWorksheet => {
  const questions: GeneratedQuestion[] = [];
  const seen = new Set<string>();
  const maxAttempts = Math.max(50, config.problemCount * 100);
  let attempts = 0;

  while (questions.length < config.problemCount && attempts < maxAttempts) {
    const operation = pickOperation(config);
    const question = createQuestion(operation, questions.length, config);
    const key = canonicalProblemKey(question);
    attempts += 1;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    questions.push(question);
  }

  if (questions.length < config.problemCount) {
    throw new HttpError(400, "Unable to generate enough unique problems for this worksheet configuration");
  }

  return {
    title: `${config.difficulty[0].toUpperCase()}${config.difficulty.slice(1)} Practice`,
    config,
    questions
  };
};
