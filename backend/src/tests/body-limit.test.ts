import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1" };
    next();
  }
}));

vi.mock("../repositories/user.repository.js", async () => {
  const actual = await vi.importActual<typeof import("../repositories/user.repository.js")>(
    "../repositories/user.repository.js"
  );

  return {
    ...actual,
    updatePublicNickname: vi.fn().mockResolvedValue({
      id: "user-1",
      email: "kid@example.com",
      public_nickname: "Quiet Fox"
    })
  };
});

import { createApp } from "../app.js";

describe("request body limits", () => {
  it("rejects oversized JSON payloads", async () => {
    const app = createApp();
    const hugeNickname = "a".repeat(120_000);

    const response = await request(app).patch("/api/users/me/profile").send({ publicNickname: hugeNickname });

    expect(response.status).toBe(413);
  });
});
