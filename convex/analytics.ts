import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// `process.env` is available in the Convex runtime, but this Expo project
// doesn't include @types/node, so declare the shape we use. Module-scoped, so
// it doesn't leak a global `process` into the rest of the app.
declare const process: { env: Record<string, string | undefined> };

// Server-side PostHog tracking. Every event we track is an authoritative fact
// about a *game* (started / ended / cancelled / a kick), so it's captured here
// — once, on the server — rather than from any player's browser. Each game is
// the entity: we use the game code as PostHog's `distinct_id`, so there's no
// player tracking and no accounts involved.
//
// We send raw atoms (counts and numbers), never pre-computed averages — totals
// and averages are both just views PostHog derives from these in the dashboard.

// Event names live here as the single source of truth (no magic strings at the
// call sites in lobby.ts).
export const AnalyticsEvent = {
  gameStarted: "game_started",
  gameEnded: "game_ended",
  gameCancelled: "game_cancelled",
  playerKicked: "player_kicked",
} as const;

// Default to PostHog EU cloud (data stays in the EU). Override with POSTHOG_HOST
// if you point at US cloud or self-hosted.
const DEFAULT_HOST = "https://eu.i.posthog.com";

// fetch() is available in the default Convex runtime, so no "use node" needed.
export const capture = internalAction({
  args: {
    event: v.string(),
    distinctId: v.string(),
    // Mixed numbers/strings; PostHog stores them as event properties.
    properties: v.optional(v.any()),
  },
  handler: async (_ctx, { event, distinctId, properties }) => {
    const apiKey = process.env.POSTHOG_API_KEY;
    if (!apiKey) {
      // No key configured (e.g. local dev) — skip silently rather than fail.
      console.warn(`[analytics] POSTHOG_API_KEY unset, skipping "${event}"`);
      return null;
    }

    const host = process.env.POSTHOG_HOST ?? DEFAULT_HOST;

    try {
      const res = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          event,
          distinct_id: distinctId,
          properties: properties ?? {},
        }),
      });
      if (!res.ok) {
        console.error(`[analytics] "${event}" failed: ${res.status}`);
      }
    } catch (err) {
      // Analytics is best-effort: never let a tracking failure surface to a player.
      console.error(`[analytics] "${event}" error:`, err);
    }
    return null;
  },
});
