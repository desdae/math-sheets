import { z } from "zod";

export const worksheetConfigSchema = z
  .object({
    problemCount: z.number().int().min(1).max(100),
    difficulty: z.enum(["easy", "medium", "hard"]),
    allowedOperations: z.array(z.enum(["+", "-", "*", "/"])).min(1),
    numberRangeMin: z.number().int().min(0),
    numberRangeMax: z.number().int().min(1),
    worksheetSize: z.enum(["small", "medium", "large"]),
    cleanDivisionOnly: z.boolean().default(true)
  })
  .refine((value) => value.numberRangeMax >= value.numberRangeMin, {
    path: ["numberRangeMax"],
    message: "numberRangeMax must be greater than or equal to numberRangeMin"
  });

export const saveWorksheetSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answerText: z.string().default("")
    })
  ),
  elapsedSeconds: z.number().int().min(0).default(0),
  status: z.enum(["draft", "partial"])
});

export const submitWorksheetSchema = z.object({
  answers: z.array(z.string().nullable())
});

export const importWorksheetsSchema = z.object({
  worksheets: z.array(
    z.object({
      localImportKey: z.string().min(1),
      title: z.string().min(1),
      status: z.enum(["draft", "partial", "completed"]),
      config: worksheetConfigSchema,
      questions: z.array(
        z.object({
          questionOrder: z.number().int().min(1),
          operation: z.enum(["+", "-", "*", "/"]),
          leftOperand: z.number(),
          rightOperand: z.number(),
          displayText: z.string(),
          correctAnswer: z.number()
        })
      ),
      answers: z.array(z.string().nullable()).default([])
    })
  )
});
