import { describe, expect, it } from "vitest";
import { scoreWorksheet } from "../services/worksheet-scoring.service.js";

describe("scoreWorksheet", () => {
  it("marks correct and incorrect answers", () => {
    const result = scoreWorksheet(
      [
        { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 3, displayText: "2 + 3 =", correctAnswer: 5 },
        { questionOrder: 2, operation: "*", leftOperand: 4, rightOperand: 2, displayText: "4 * 2 =", correctAnswer: 8 }
      ],
      ["5", "6"]
    );

    expect(result.scoreCorrect).toBe(1);
    expect(result.scoreTotal).toBe(2);
    expect(result.accuracyPercentage).toBe(50);
  });
});
