import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { HttpError } from "../lib/http-error.js";
import { scoreWorksheet } from "../services/worksheet-scoring.service.js";
import type {
  GeneratedQuestion,
  WorksheetAnswerInput,
  WorksheetConfig,
  WorksheetStatus
} from "../types/worksheet.js";

const mapWorksheetRow = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  status: row.status,
  difficulty: row.difficulty,
  problemCount: row.problem_count,
  allowedOperations: row.allowed_operations,
  numberRangeMin: row.number_range_min,
  numberRangeMax: row.number_range_max,
  worksheetSize: row.worksheet_size,
  cleanDivisionOnly: row.clean_division_only,
  source: row.source,
  createdAt: row.created_at,
  submittedAt: row.submitted_at,
  saveRevision: Number(row.save_revision ?? 0),
  elapsedSeconds: Number(row.elapsed_seconds ?? 0),
  result:
    row.score_total != null
      ? {
          scoreCorrect: Number(row.score_correct),
          scoreTotal: Number(row.score_total),
          accuracyPercentage: Number(row.accuracy_percentage)
        }
      : undefined
});

const findOwnedWorksheet = async (
  client: typeof pool | Awaited<ReturnType<typeof pool.connect>>,
  worksheetId: string,
  userId: string
) => {
  const result = await client.query(
    `SELECT id, status, source, awards_credit
     FROM worksheets
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [worksheetId, userId]
  );

  const worksheet = result.rows[0];

  if (!worksheet) {
    throw new HttpError(404, "Worksheet not found");
  }

  return worksheet;
};

export const createWorksheetWithAttempt = async (input: {
  userId: string | null;
  title: string;
  config: WorksheetConfig;
  questions: GeneratedQuestion[];
  source: "generated" | "imported";
  localImportKey?: string;
  status?: WorksheetStatus;
  createdAt?: string;
  elapsedSeconds?: number;
}) => {
  const client = await pool.connect();
  const initialTimestamp = input.createdAt ?? new Date().toISOString();
  const awardsCredit = input.source === "generated";

  try {
    await client.query("BEGIN");
    const worksheetResult = await client.query(
      `INSERT INTO worksheets (
        user_id, title, status, difficulty, problem_count, allowed_operations,
        number_range_min, number_range_max, worksheet_size, clean_division_only, source, awards_credit, local_import_key, started_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        input.userId,
        input.title,
        input.status ?? "draft",
        input.config.difficulty,
        input.config.problemCount,
        input.config.allowedOperations,
        input.config.numberRangeMin,
        input.config.numberRangeMax,
        input.config.worksheetSize,
        input.config.cleanDivisionOnly,
        input.source,
        awardsCredit,
        input.localImportKey ?? randomUUID(),
        initialTimestamp,
        initialTimestamp
      ]
    );

    const worksheet = worksheetResult.rows[0];
    const insertedQuestions: GeneratedQuestion[] = [];

    for (const question of input.questions) {
      const inserted = await client.query(
        `INSERT INTO worksheet_questions (
          worksheet_id, question_order, operation, left_operand, right_operand, display_text, correct_answer
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          worksheet.id,
          question.questionOrder,
          question.operation,
          question.leftOperand,
          question.rightOperand,
          question.displayText,
          question.correctAnswer
        ]
      );

      insertedQuestions.push({
        id: inserted.rows[0].id,
        questionOrder: inserted.rows[0].question_order,
        operation: inserted.rows[0].operation,
        leftOperand: inserted.rows[0].left_operand,
        rightOperand: inserted.rows[0].right_operand,
        displayText: inserted.rows[0].display_text,
        correctAnswer: Number(inserted.rows[0].correct_answer)
      });
    }

    const attemptResult = await client.query(
      `INSERT INTO worksheet_attempts (worksheet_id, user_id, status, elapsed_seconds)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [worksheet.id, input.userId, input.status ?? "draft", input.elapsedSeconds ?? 0]
    );

    await client.query("COMMIT");

    return {
      worksheet: mapWorksheetRow(worksheet),
      attempt: attemptResult.rows[0],
      questions: insertedQuestions
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const saveWorksheetAnswers = async (input: {
  worksheetId: string;
  userId: string;
  answers: WorksheetAnswerInput[];
  saveRevision: number;
  elapsedSeconds: number;
  status: "draft" | "partial";
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const worksheet = await findOwnedWorksheet(client, input.worksheetId, input.userId);
    if (worksheet.status === "completed") {
      throw new HttpError(409, "Completed worksheets cannot be changed");
    }

    const attemptResult = await client.query(
      `SELECT id, save_revision FROM worksheet_attempts WHERE worksheet_id = $1 ORDER BY started_at ASC LIMIT 1`,
      [input.worksheetId]
    );

    const attemptId = attemptResult.rows[0]?.id;
    const currentSaveRevision = Number(attemptResult.rows[0]?.save_revision ?? 0);

    if (input.saveRevision < currentSaveRevision) {
      await client.query("ROLLBACK");
      return { worksheetId: input.worksheetId, status: worksheet.status };
    }

    const questionResult = await client.query(`SELECT id FROM worksheet_questions WHERE worksheet_id = $1`, [input.worksheetId]);
    const allowedQuestionIds = new Set(questionResult.rows.map((row: { id: string }) => row.id));

    for (const answer of input.answers) {
      if (!allowedQuestionIds.has(answer.questionId)) {
        throw new HttpError(400, "Answer question does not belong to worksheet");
      }
    }

    for (const answer of input.answers) {
      await client.query(
        `INSERT INTO worksheet_answers (attempt_id, worksheet_question_id, answer_text, answered_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (attempt_id, worksheet_question_id)
         DO UPDATE SET answer_text = EXCLUDED.answer_text, answered_at = NOW()`,
        [attemptId, answer.questionId, answer.answerText]
      );
    }

    await client.query(
      `UPDATE worksheet_attempts
       SET status = $2, save_revision = $3, elapsed_seconds = $4, last_saved_at = NOW()
       WHERE id = $1`,
      [attemptId, input.status, input.saveRevision, input.elapsedSeconds]
    );

    await client.query(
      `UPDATE worksheets SET status = $2, updated_at = NOW() WHERE id = $1`,
      [input.worksheetId, input.status]
    );

    await client.query("COMMIT");
    return { worksheetId: input.worksheetId, status: input.status };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getWorksheetDetails = async (worksheetId: string, userId: string) => {
  const worksheetResult = await pool.query(
    `SELECT w.*,
            att.elapsed_seconds,
            att.save_revision,
            att.score_correct,
            att.score_total,
            att.accuracy_percentage
     FROM worksheets w
     LEFT JOIN LATERAL (
       SELECT elapsed_seconds, save_revision, score_correct, score_total, accuracy_percentage
       FROM worksheet_attempts
       WHERE worksheet_id = w.id
       ORDER BY started_at ASC
       LIMIT 1
     ) att ON TRUE
     WHERE w.id = $1 AND w.user_id = $2`,
    [worksheetId, userId]
  );

  if (!worksheetResult.rows[0]) {
    throw new HttpError(404, "Worksheet not found");
  }

  const questionResult = await pool.query(
    `SELECT * FROM worksheet_questions WHERE worksheet_id = $1 ORDER BY question_order ASC`,
    [worksheetId]
  );
  const answerResult = await pool.query(
    `SELECT wa.*, wq.question_order
     FROM worksheet_answers wa
     JOIN worksheet_attempts att ON att.id = wa.attempt_id
     JOIN worksheet_questions wq ON wq.id = wa.worksheet_question_id
     WHERE att.id = (
       SELECT id
       FROM worksheet_attempts
       WHERE worksheet_id = $1
       ORDER BY started_at ASC
       LIMIT 1
     )
     ORDER BY wq.question_order ASC`,
    [worksheetId]
  );

  return {
    worksheet: worksheetResult.rows[0] ? mapWorksheetRow(worksheetResult.rows[0]) : null,
    questions: questionResult.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      questionOrder: row.question_order,
      operation: row.operation,
      leftOperand: row.left_operand,
      rightOperand: row.right_operand,
      displayText: row.display_text,
      correctAnswer: Number(row.correct_answer)
    })),
    answers: answerResult.rows.map((row: Record<string, unknown>) => ({
      questionOrder: row.question_order,
      answerText: row.answer_text,
      isCorrect: row.is_correct
    }))
  };
};

export const submitWorksheet = async (input: {
  worksheetId: string;
  userId: string;
  answers: Array<string | null>;
  elapsedSeconds?: number;
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const worksheet = await findOwnedWorksheet(client, input.worksheetId, input.userId);

    if (worksheet.status === "completed") {
      throw new HttpError(409, "Completed worksheets cannot be changed");
    }

    const questionResult = await client.query(
      `SELECT * FROM worksheet_questions WHERE worksheet_id = $1 ORDER BY question_order ASC`,
      [input.worksheetId]
    );

    const questions = questionResult.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      questionOrder: row.question_order,
      operation: row.operation,
      leftOperand: row.left_operand,
      rightOperand: row.right_operand,
      displayText: row.display_text,
      correctAnswer: Number(row.correct_answer)
    }));

    const scored = scoreWorksheet(questions, input.answers);
    const attemptResult = await client.query(
      `SELECT id, user_id, elapsed_seconds FROM worksheet_attempts WHERE worksheet_id = $1 ORDER BY started_at ASC LIMIT 1`,
      [input.worksheetId]
    );

    const attempt = attemptResult.rows[0];
    const finalElapsedSeconds = Math.max(Number(attempt.elapsed_seconds ?? 0), Number(input.elapsedSeconds ?? 0));

    for (const [index, answer] of scored.evaluatedAnswers.entries()) {
      await client.query(
        `INSERT INTO worksheet_answers (attempt_id, worksheet_question_id, answer_text, is_correct, answered_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (attempt_id, worksheet_question_id)
         DO UPDATE SET answer_text = EXCLUDED.answer_text, is_correct = EXCLUDED.is_correct, answered_at = NOW()`,
        [attempt.id, questions[index].id, answer.answerText, answer.isCorrect]
      );
    }

    await client.query(
      `UPDATE worksheet_attempts
       SET status = 'completed',
           completed_at = NOW(),
           last_saved_at = NOW(),
           elapsed_seconds = $5,
           score_correct = $2,
           score_total = $3,
           accuracy_percentage = $4
       WHERE id = $1`,
      [attempt.id, scored.scoreCorrect, scored.scoreTotal, scored.accuracyPercentage, finalElapsedSeconds]
    );

    await client.query(
      `UPDATE worksheets
       SET status = 'completed', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [input.worksheetId]
    );

    if (attempt.user_id && worksheet.awards_credit) {
      await client.query(
        `INSERT INTO user_statistics (user_id, worksheets_completed, problems_solved, correct_answers, accuracy_percentage, last_activity_date, updated_at)
         VALUES ($1, 1, $2, $3, $4, CURRENT_DATE, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           worksheets_completed = user_statistics.worksheets_completed + 1,
           problems_solved = user_statistics.problems_solved + EXCLUDED.problems_solved,
           correct_answers = user_statistics.correct_answers + EXCLUDED.correct_answers,
           accuracy_percentage = ROUND(((user_statistics.correct_answers + EXCLUDED.correct_answers)::numeric / NULLIF(user_statistics.problems_solved + EXCLUDED.problems_solved, 0)) * 100, 2),
           last_activity_date = CURRENT_DATE,
           updated_at = NOW()`,
        [attempt.user_id, scored.scoreTotal, scored.scoreCorrect, scored.accuracyPercentage]
      );
    }

    await client.query("COMMIT");
    return {
      ...scored,
      elapsedSeconds: finalElapsedSeconds
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const importLocalWorksheets = async (
  userId: string,
  worksheets: Array<{
    localImportKey: string;
    title: string;
    status: WorksheetStatus;
    config: WorksheetConfig;
    questions: GeneratedQuestion[];
    answers: Array<string | null>;
    createdAt?: string;
    elapsedSeconds?: number;
  }>
) => {
  const imported = [];

  for (const worksheet of worksheets) {
    const initialStatus = worksheet.status === "completed" ? "partial" : worksheet.status;
    const created = await createWorksheetWithAttempt({
      userId,
      title: worksheet.title,
      config: worksheet.config,
      questions: worksheet.questions,
      source: "imported",
      localImportKey: worksheet.localImportKey,
      status: initialStatus,
      createdAt: worksheet.createdAt,
      elapsedSeconds: worksheet.elapsedSeconds
    });

    if (worksheet.status === "completed") {
      await submitWorksheet({
        worksheetId: created.worksheet.id as string,
        userId,
        answers: worksheet.answers,
        elapsedSeconds: worksheet.elapsedSeconds
      });
    }

    imported.push(created);
  }

  return imported;
};

export const listWorksheetsByUserId = async (userId: string) => {
  const result = await pool.query(
    `SELECT w.*,
            att.elapsed_seconds,
            att.score_correct,
            att.score_total,
            att.accuracy_percentage
     FROM worksheets w
     LEFT JOIN LATERAL (
       SELECT elapsed_seconds, score_correct, score_total, accuracy_percentage
       FROM worksheet_attempts
       WHERE worksheet_id = w.id
       ORDER BY started_at ASC
       LIMIT 1
     ) att ON TRUE
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );

  return result.rows.map((row: Record<string, unknown>) => mapWorksheetRow(row));
};

export const getUserStatisticsByUserId = async (userId: string) => {
  const result = await pool.query(`SELECT * FROM user_statistics WHERE user_id = $1`, [userId]);
  return result.rows[0] ?? null;
};

export const getUserHistoryByUserId = async (userId: string) => {
  const result = await pool.query(
    `SELECT id, title, status, created_at, submitted_at, difficulty, problem_count
     FROM worksheets
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    difficulty: row.difficulty,
    problemCount: row.problem_count
  }));
};
