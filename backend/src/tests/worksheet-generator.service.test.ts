import { describe, expect, it } from "vitest";
import { generateWorksheet } from "../services/worksheet-generator.service.js";

describe("generateWorksheet", () => {
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
});
