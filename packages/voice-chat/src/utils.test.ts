import { describe, expect, it } from "vitest";
import { sanitizeMessage } from "./utils";

describe("sanitizeMessage", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeMessage("  a  b  \n c  ")).toBe("a b c");
  });

  it("returns empty for blank", () => {
    expect(sanitizeMessage("   ")).toBe("");
  });
});
