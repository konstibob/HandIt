import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    gameCode: v.string(),
    // Human-friendly room name the host picks at creation (e.g. "Saturday
    // Showdown"). Shown in the lobby list and at the top of the game screen so
    // players can tell their many games apart. Optional: games created before
    // this feature have none — fall back to the gameCode for display.
    roomName: v.optional(v.string()),
    phase: v.union(
      v.literal("joinable"),
      v.literal("started"),
      v.literal("ended")
    ),
    // Set when the game ends (2 players remain): the player with the most kills.
    winnerId: v.optional(v.id("players")),
    // Headcount at the moment the game started, snapshotted in startGame. Powers
    // the "Started with X players" line (the live roster shrinks as people die).
    startedPlayerCount: v.optional(v.number()),
    // Wall-clock timestamps (ms) used only for analytics: game duration =
    // endedAt - startedAt. Absent on lobbies that never started.
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index("by_gameCode", ["gameCode"]),

  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    isHost: v.boolean(),
    status: v.union(v.literal("alive"), v.literal("dead")),
    currentTarget: v.optional(v.id("players")),
    // Number of handoffs this player has confirmed against them (their kills).
    // Optional for rows created before the game starts; treat absent as 0.
    kills: v.optional(v.number()),
    placement: v.optional(v.number()),
    eliminatedAt: v.optional(v.number()),
    // Who handed this player the card (set in eliminate()). Powers the kill feed.
    killedBy: v.optional(v.id("players")),
    // The device/user that owns this player row — a client-generated secret token
    // (handit_user_id). It's what ties a person's many player rows (one per game)
    // together, so `myGames` can list every lobby they're in from a single token.
    // Optional: rows created before this feature have none; also cleared when a
    // finished game is dismissed from the user's list. Like a player `_id`, it is
    // a private bearer credential and is NEVER returned by a public roster query.
    userId: v.optional(v.string()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_userId", ["userId"]),
});
