import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWorksheet } from "../services/worksheet-generator.service.js";

describe("generateWorksheet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the requested number of questions", () => {
    const worksheet = generateWorksheet({
      problemCount: 12,
      difficulty: "easy",
      allowedOperations: ["+", "-"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    expect(worksheet.questions).toHaveLength(12);
  });

  it("creates integer division answers when clean division is enabled", () => {
    const worksheet = generateWorksheet({
      problemCount: 10,
      difficulty: "medium",
      allowedOperations: ["/"],
      numberRangeMin: 1,
      numberRangeMax: 100,
      worksheetSize: "medium",
      cleanDivisionOnly: true
    });

    expect(worksheet.questions.every((question) => Number.isInteger(question.correctAnswer))).toBe(true);
  });

  it("does not repeat problems within one worksheet", () => {
    const worksheet = generateWorksheet({
      problemCount: 20,
      difficulty: "medium",
      allowedOperations: ["+", "-", "*"],
      numberRangeMin: 1,
      numberRangeMax: 25,
      worksheetSize: "medium",
      cleanDivisionOnly: true
    });

    const keys = worksheet.questions.map((question) => `${question.leftOperand}|${question.operation}|${question.rightOperand}`);
    expect(new Set(keys).size).toBe(worksheet.questions.length);
  });

  it("throws a clear error when the config cannot produce enough unique problems", () => {
    expect(() =>
      generateWorksheet({
        problemCount: 2,
        difficulty: "easy",
        allowedOperations: ["+"],
        numberRangeMin: 1,
        numberRangeMax: 1,
        worksheetSize: "small",
        cleanDivisionOnly: true
      })
    ).toThrowError("Unable to generate enough unique problems");
  });

  it("allows hard subtraction to go negative while easy stays non-negative", () => {
    const randomValues = [0, 0.99];
    let index = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      const value = randomValues[index] ?? 0;
      index += 1;
      return value;
    });

    const easyWorksheet = generateWorksheet({
      problemCount: 1,
      difficulty: "easy",
      allowedOperations: ["-"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    index = 0;

    const hardWorksheet = generateWorksheet({
      problemCount: 1,
      difficulty: "hard",
      allowedOperations: ["-"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    expect(easyWorksheet.questions[0].correctAnswer).toBeGreaterThanOrEqual(0);
    expect(hardWorksheet.questions[0].correctAnswer).toBeLessThan(0);
  });
});
