import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { authenticate } from "../middleware/authenticate.js";
import { noStore } from "../middleware/no-store.js";
import { validateBody } from "../middleware/validate.js";
import {
  createWorksheetWithAttempt,
  getWorksheetDetails,
  importLocalWorksheets,
  listWorksheetsByUserId,
  saveWorksheetAnswers,
  submitWorksheet
} from "../repositories/worksheet.repository.js";
import { importWorksheetsSchema, saveWorksheetSchema, submitWorksheetSchema, worksheetConfigSchema } from "../schemas/worksheet.schema.js";
import { generateWorksheet } from "../services/worksheet-generator.service.js";

export const worksheetRouter = Router();

worksheetRouter.post("/generate", validateBody(worksheetConfigSchema), (req, res) => {
  res.json(generateWorksheet(req.body));
});

worksheetRouter.post(
  "/",
  authenticate,
  noStore,
  validateBody(worksheetConfigSchema),
  asyncHandler(async (req, res) => {
    const worksheet = generateWorksheet(req.body);
    const persisted = await createWorksheetWithAttempt({
      userId: req.user?.id ?? null,
      title: worksheet.title,
      config: worksheet.config,
      questions: worksheet.questions,
      source: "generated"
    });

    res.status(201).json({
      worksheet: persisted.worksheet,
      attempt: persisted.attempt,
      questions: persisted.questions
    });
  })
);

worksheetRouter.get(
  "/",
  authenticate,
  noStore,
  asyncHandler(async (req, res) => {
    res.json(await listWorksheetsByUserId(req.user!.id));
  })
);

worksheetRouter.get(
  "/:id",
  authenticate,
  noStore,
  asyncHandler(async (req, res) => {
    res.json(await getWorksheetDetails(String(req.params.id), req.user!.id));
  })
);

worksheetRouter.patch(
  "/:id/save",
  authenticate,
  noStore,
  validateBody(saveWorksheetSchema),
  asyncHandler(async (req, res) => {
    res.json(
      await saveWorksheetAnswers({
        worksheetId: String(req.params.id),
        userId: req.user!.id,
        answers: req.body.answers,
        elapsedSeconds: req.body.elapsedSeconds,
        status: req.body.status
      })
    );
  })
);

worksheetRouter.post(
  "/:id/submit",
  authenticate,
  noStore,
  validateBody(submitWorksheetSchema),
  asyncHandler(async (req, res) => {
    res.json(
      await submitWorksheet({
        worksheetId: String(req.params.id),
        userId: req.user!.id,
        answers: req.body.answers,
        elapsedSeconds: req.body.elapsedSeconds
      })
    );
  })
);

worksheetRouter.post(
  "/import-local",
  authenticate,
  noStore,
  validateBody(importWorksheetsSchema),
  asyncHandler(async (req, res) => {
    const imported = await importLocalWorksheets(req.user!.id, req.body.worksheets);
    res.status(201).json({ importedCount: imported.length, worksheets: imported });
  })
);
