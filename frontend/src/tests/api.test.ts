import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../lib/api";

describe("resolveApiBaseUrl", () => {
  it("prefers the explicit VITE_API_BASE_URL when provided", () => {
    expect(resolveApiBaseUrl("https://api.mathsheets.test/api", false, "https://app.mathsheets.test")).toBe(
      "https://api.mathsheets.test/api"
    );
  });

  it("uses the frontend origin in production when no env override is set", () => {
    expect(resolveApiBaseUrl("", false, "https://app.mathsheets.test")).toBe("https://app.mathsheets.test/api");
  });

  it("keeps the localhost fallback only for development", () => {
    expect(resolveApiBaseUrl("", true, "http://localhost:5173")).toBe("http://localhost:3000/api");
  });
});
