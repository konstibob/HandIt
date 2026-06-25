import { describe, expect, test } from "vitest";
import { ConvexError } from "convex/values";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  test("returns the clean payload from a ConvexError string", () => {
    const e = new ConvexError("That name is already taken in this lobby. Pick another.");
    expect(friendlyError(e)).toBe("That name is already taken in this lobby. Pick another.");
  });

  test("reads .message from a ConvexError object payload", () => {
    const e = new ConvexError({ message: "Lobby not found." });
    expect(friendlyError(e)).toBe("Lobby not found.");
  });

  test("falls back for a ConvexError with an unusable payload", () => {
    const e = new ConvexError({ code: 42 } as never);
    expect(friendlyError(e, "fallback")).toBe("fallback");
  });

  test("keeps a short, clean plain-Error message", () => {
    expect(friendlyError(new Error("Network request failed"))).toBe(
      "Network request failed"
    );
  });

  test("never surfaces the raw server dump", () => {
    const dump =
      "[CONVEX M(lobby:joinGame)] [Request ID: f806c2] Server Error\nUncaught ConvexError: x\n    at handler (../convex/lobby.ts:373:21)";
    const result = friendlyError(new Error(dump), "fallback");
    expect(result).toBe("fallback");
    expect(result).not.toContain("CONVEX");
  });

  test("falls back for non-errors", () => {
    expect(friendlyError(undefined, "fallback")).toBe("fallback");
    expect(friendlyError("a string", "fallback")).toBe("fallback");
  });
});
