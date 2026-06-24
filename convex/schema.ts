import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    gameCode: v.string(),
    phase: v.union(
      v.literal("joinable"),
      v.literal("started"),
      v.literal("ended")
    ),
    // Set when the game ends (2 players remain): the player with the most kills.
    winnerId: v.optional(v.id("players")),
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
  }).index("by_gameId", ["gameId"]),
});
