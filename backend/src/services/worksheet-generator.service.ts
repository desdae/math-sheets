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
      max: Math.min(config.numberRangeMax, Math.max(config.numberRangeMin + 49, config.numberRangeMin))
    };
  }

  return {
    min: config.numberRangeMin,
    max: config.numberRangeMax
  };
};

const createQuestion = (operation: Operation, index: number, config: WorksheetConfig): GeneratedQuestion => {
  const range = buildDifficultyRange(config);
  let leftOperand = randomInt(range.min, range.max);
  let rightOperand = randomInt(range.min || 1, Math.max(range.max, 1));

  if (operation === "-" && config.difficulty !== "hard" && leftOperand < rightOperand) {
    [leftOperand, rightOperand] = [rightOperand, leftOperand];
  }

  if (operation === "*") {
    const multiplierCap = config.difficulty === "hard" ? 20 : config.difficulty === "medium" ? 12 : 10;
    leftOperand = randomInt(Math.max(1, range.min), Math.min(range.max, multiplierCap));
    rightOperand = randomInt(Math.max(1, range.min), Math.min(range.max, multiplierCap));
  }

  if (operation === "/") {
    if (config.cleanDivisionOnly) {
      rightOperand = randomInt(1, Math.max(1, Math.min(range.max, 12)));
      const answer = randomInt(1, Math.max(1, Math.floor(Math.max(range.max, 1) / rightOperand)));
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
  const questions = Array.from({ length: config.problemCount }, (_, index) => {
    const operation = pick(config.allowedOperations);
    return createQuestion(operation, index, config);
  });

  return {
    title: `${config.difficulty[0].toUpperCase()}${config.difficulty.slice(1)} Practice`,
    config,
    questions
  };
};
