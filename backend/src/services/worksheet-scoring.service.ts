import type { GeneratedQuestion } from "../types/worksheet.js";

export const scoreWorksheet = (questions: GeneratedQuestion[], answers: Array<string | null>) => {
  const evaluatedAnswers = questions.map((question, index) => {
    const answerText = answers[index] ?? "";
    const numericAnswer = Number(answerText);
    const isCorrect = answerText !== "" && numericAnswer === question.correctAnswer;

    return {
      questionOrder: question.questionOrder,
      answerText,
      isCorrect
    };
  });

  const scoreCorrect = evaluatedAnswers.filter((entry) => entry.isCorrect).length;
  const scoreTotal = questions.length;
  const accuracyPercentage = scoreTotal === 0 ? 0 : Number(((scoreCorrect / scoreTotal) * 100).toFixed(2));

  return {
    scoreCorrect,
    scoreTotal,
    accuracyPercentage,
    evaluatedAnswers
  };
};
