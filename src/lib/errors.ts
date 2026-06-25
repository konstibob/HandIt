import { ConvexError } from "convex/values";

// Turns whatever a mutation/query throws into a short, player-friendly line.
//
// When a Convex function throws `new ConvexError("...")`, the client receives a
// ConvexError whose `.data` is exactly that payload (our friendly string). Its
// `.message`, by contrast, is the noisy server dump —
// "[CONVEX M(lobby:joinGame)] [Request ID: ...] Server Error\nUncaught
// ConvexError: ... at handler (../convex/lobby.ts:373)" — which must never reach
// a player. So we read `.data` first and only fall back to a clean `.message`,
// rejecting anything that still looks like the raw server error.
export function friendlyError(
  e: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (e instanceof ConvexError) {
    const data = e.data as unknown;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
    return fallback;
  }

  if (e instanceof Error && e.message && !looksLikeServerDump(e.message)) {
    return e.message;
  }

  return fallback;
}

function looksLikeServerDump(message: string): boolean {
  return (
    message.includes("[CONVEX") ||
    message.includes("Server Error") ||
    message.includes("Uncaught") ||
    message.includes("at handler")
  );
}
