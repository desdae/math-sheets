import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { signAccessToken } from "../lib/jwt.js";
import { HttpError } from "../lib/http-error.js";

const { getWorksheetDetailsMock, saveWorksheetAnswersMock, submitWorksheetMock } = vi.hoisted(() => ({
  getWorksheetDetailsMock: vi.fn(),
  saveWorksheetAnswersMock: vi.fn(),
  submitWorksheetMock: vi.fn()
}));

vi.mock("../repositories/worksheet.repository.js", async () => {
  const actual = await vi.importActual<typeof import("../repositories/worksheet.repository.js")>(
    "../repositories/worksheet.repository.js"
  );

  return {
    ...actual,
    getWorksheetDetails: getWorksheetDetailsMock,
    saveWorksheetAnswers: saveWorksheetAnswersMock,
    submitWorksheet: submitWorksheetMock
  };
});

describe("worksheet ownership enforcement", () => {
  beforeEach(() => {
    getWorksheetDetailsMock.mockReset();
    saveWorksheetAnswersMock.mockReset();
    submitWorksheetMock.mockReset();
  });

  it("passes the signed-in user id into worksheet detail lookups", async () => {
    getWorksheetDetailsMock.mockResolvedValue({ worksheet: null, questions: [], answers: [] });

    const response = await request(createApp())
      .get("/api/worksheets/worksheet-123")
      .set("Authorization", `Bearer ${signAccessToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(getWorksheetDetailsMock).toHaveBeenCalledWith("worksheet-123", "user-1");
  });

  it("marks worksheet detail responses as non-cacheable", async () => {
    getWorksheetDetailsMock.mockResolvedValue({ worksheet: null, questions: [], answers: [] });

    const response = await request(createApp())
      .get("/api/worksheets/worksheet-123")
      .set("Authorization", `Bearer ${signAccessToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers.etag).toBeUndefined();
  });

  it("passes the signed-in user id into worksheet save operations", async () => {
    saveWorksheetAnswersMock.mockResolvedValue({ worksheetId: "worksheet-123", status: "partial" });

    const response = await request(createApp())
      .patch("/api/worksheets/worksheet-123/save")
      .set("Authorization", `Bearer ${signAccessToken("user-2")}`)
      .send({
        answers: [{ questionId: "00000000-0000-0000-0000-000000000001", answerText: "7" }],
        elapsedSeconds: 3,
        status: "partial"
      });

    expect(response.status).toBe(200);
    expect(saveWorksheetAnswersMock).toHaveBeenCalledWith(
      expect.objectContaining({ worksheetId: "worksheet-123", userId: "user-2" })
    );
  });

  it("returns 404 when submitting a worksheet the caller does not own", async () => {
    submitWorksheetMock.mockRejectedValue(new HttpError(404, "Worksheet not found"));

    const response = await request(createApp())
      .post("/api/worksheets/worksheet-123/submit")
      .set("Authorization", `Bearer ${signAccessToken("user-3")}`)
      .send({
        answers: ["7", "9"]
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Worksheet not found");
    expect(submitWorksheetMock).toHaveBeenCalledWith(
      expect.objectContaining({ worksheetId: "worksheet-123", userId: "user-3" })
    );
  });
});
