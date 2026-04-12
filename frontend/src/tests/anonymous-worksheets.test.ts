import { describe, expect, it } from "vitest";
import { createAnonymousWorksheetStore } from "../composables/useAnonymousWorksheets";

describe("anonymous worksheets", () => {
  it("persists local worksheets", () => {
    const store = createAnonymousWorksheetStore("test-key");
    store.save([{ id: "local-1", title: "Easy Practice" }]);
    expect(store.load()).toHaveLength(1);
    store.clear();
  });
});
