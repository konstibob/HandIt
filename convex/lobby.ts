import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { AnalyticsEvent } from "./analytics";

// ─── Game codes ───────────────────────────────────────────────────────────────

// Omitting easily confused characters: 0/O, 1/I/L
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
// How many candidates to draw in one shot. The code space (32^6 ≈ 1.07B) dwarfs
// the number of lobbies, so a handful of random candidates is essentially
// guaranteed to contain a free one — no retry round-trips, no loop.
const CANDIDATE_COUNT = 32;

const randomCode = (): string =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");

// Pick a code that isn't in `used`, from a single batch of candidates.
function pickFreeCode(used: Set<string>): string {
  const code = Array.from({ length: CANDIDATE_COUNT }, randomCode).find(
    (c) => !used.has(c)
  );
  if (!code) {
    // Statistically unreachable unless the table holds hundreds of millions of
    // lobbies; surfaced so a caller can simply retry rather than insert a dup.
    throw new ConvexError("Couldn't allocate a free game code. Try again.");
  }
  return code;
}

// ─── Roster helper ─────────────────────────────────────────────────────────────

// A game's roster is inherently small (one lobby), so reading the whole set is
// fine — but cap it to stay bounded per the Convex guidelines.
const PLAYER_LIMIT = 50;

function playersInGame(ctx: QueryCtx, gameId: Id<"games">) {
  return ctx.db
    .query("players")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .take(PLAYER_LIMIT);
}

// ─── Public queries ────────────────────────────────────────────────────────────

// Anyone with the code can read this — Convex queries are public HTTP endpoints,
// so we only ever expose what every player is allowed to see: names, host flag,
// alive/dead status, kill counts. Crucially NO player `_id`s and NO
// `currentTarget`s leave the server here, or the entire secret ring would leak
// to every browser. Cross-player references are made by (lobby-unique) name; a
// caller's own `_id` is the only thing that lets them read their own secrets.
export const getLobby = query({
  args: { gameCode: v.string() },
  handler: async (ctx, { gameCode }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_gameCode", (q) => q.eq("gameCode", gameCode))
      .unique();

    if (!game) return null;

    const roster = await playersInGame(ctx, game._id);

    let winnerName: string | null = null;
    if (game.winnerId) {
      winnerName = roster.find((p) => p._id === game.winnerId)?.name ?? null;
    }

    return {
      game: { gameCode: game.gameCode, phase: game.phase, winnerName },
      players: roster.map((p) => ({
        name: p.name,
        isHost: p.isHost,
        status: p.status,
        kills: p.kills ?? 0,
      })),
    };
  },
});

//has to load on a different screen depending on when player rejoins, isnt currently handled
//if gamephase is ended you cant join, but if gamephase is joinable you should go to one screen 
//and if it is started then to another! 
export const rejoinCheck = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) return null;

    const game = await ctx.db.get(player.gameId);
    if (!game || game.phase === "ended") return null;

    return { gameCode: game.gameCode, playerName: player.name };
  },
});

// ─── Private queries (gated by your own player id) ──────────────────────────────

// Your secret target. Only you can read it: it's keyed by your own `_id`, which
// is never exposed by any public query, so it acts as your bearer credential.
export const myTarget = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const me = await ctx.db.get(playerId);
    if (!me) return { targetName: null };

    const game = await ctx.db.get(me.gameId);
    if (!game || game.phase !== "started" || me.status !== "alive") {
      return { targetName: null };
    }

    const target = me.currentTarget ? await ctx.db.get(me.currentTarget) : null;
    return { targetName: target?.name ?? null };
  },
});

// The full hunt circle (who hunts whom). This is the spoiler view — the server
// only hands it over once you're allowed to see it: you're dead, or the game has
// ended. Alive players get null, no matter how they call it.
export const getHuntCircle = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const me = await ctx.db.get(playerId);
    if (!me) return null;

    const game = await ctx.db.get(me.gameId);
    if (!game) return null;

    const allowed = me.status === "dead" || game.phase === "ended";
    if (!allowed) return null;

    const roster = await playersInGame(ctx, game._id);
    const nameById = new Map(roster.map((p) => [p._id, p.name]));
    const edges = roster
      .filter((p) => p.currentTarget)
      .map((p) => ({ from: p.name, to: nameById.get(p.currentTarget!) ?? "?" }));

    return {
      players: roster.map((p) => ({ name: p.name, status: p.status })),
      edges,
    };
  },
});

// The kill feed: every elimination so far as "<killer> handed it to <victim>".
// Public — visible to all players (alive included). Like getLobby, ids never
// leave the server; killer/victim are referenced by their lobby-unique names.
// Showing the killer reveals a *past* ring edge, which is expected in an
// assassin game; current targets stay secret (those live only in myTarget).
export const getKillFeed = query({
  args: { gameCode: v.string() },
  handler: async (ctx, { gameCode }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_gameCode", (q) => q.eq("gameCode", gameCode))
      .unique();
    if (!game) return { entries: [], startedAt: null };

    const roster = await playersInGame(ctx, game._id);
    const nameById = new Map(roster.map((p) => [p._id, p.name]));

    const entries = roster
      .filter((p) => p.status === "dead" && p.eliminatedAt !== undefined)
      .sort((a, b) => (b.eliminatedAt ?? 0) - (a.eliminatedAt ?? 0)) // newest first
      .map((p) => ({
        victimName: p.name,
        killerName: p.killedBy ? nameById.get(p.killedBy) ?? null : null,
        eliminatedAt: p.eliminatedAt as number,
      }));

    // startedAt anchors the static "Xm in" timestamps shown in the feed/timeline.
    return { entries, startedAt: game.startedAt ?? null };
  },
});

// The end-of-game standings, shown on the result screen to everyone. Only
// available once the game has ended. Like getLobby, no ids/targets leave the
// server — players are referenced by their lobby-unique names. Each row carries
// the two ranking stats: total kills (the winner metric) and how long the
// player survived. Winner(s) = the highest kill count; ties yield co-winners.
export const getResults = query({
  args: { gameCode: v.string() },
  handler: async (ctx, { gameCode }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_gameCode", (q) => q.eq("gameCode", gameCode))
      .unique();
    if (!game || game.phase !== "ended") return null;

    const roster = await playersInGame(ctx, game._id);
    const maxKills = roster.reduce((m, p) => Math.max(m, p.kills ?? 0), 0);
    // The two survivors have no eliminatedAt, so they "survived" until the game
    // ended. endedAt is set the moment the game ends; fall back to now defensively.
    const end = game.endedAt ?? Date.now();

    const players = roster
      .map((p) => ({
        name: p.name,
        kills: p.kills ?? 0,
        status: p.status,
        // null only if startedAt was somehow never recorded.
        survivedSeconds:
          game.startedAt != null
            ? Math.round(((p.eliminatedAt ?? end) - game.startedAt) / 1000)
            : null,
        isWinner: maxKills > 0 && (p.kills ?? 0) === maxKills,
      }))
      .sort(
        (a, b) =>
          b.kills - a.kills ||
          (b.survivedSeconds ?? 0) - (a.survivedSeconds ?? 0) ||
          a.name.localeCompare(b.name)
      );

    return {
      players,
      winnerNames: players.filter((p) => p.isWinner).map((p) => p.name),
    };
  },
});

// ─── Game logic ───────────────────────────────────────────────────────────────

// Hand the host role to another player when the current host departs.
// Prefers an alive player; ends the game if nobody is left.
async function transferHostAway(ctx: MutationCtx, leaver: Doc<"players">) {
  const roster = await playersInGame(ctx, leaver.gameId);
  const others = roster.filter((p) => p._id !== leaver._id);
  if (others.length === 0) {
    const game = await ctx.db.get(leaver.gameId);
    await ctx.db.patch(leaver.gameId, { phase: "ended" });
    // A lobby that empties while still "joinable" never became a real game —
    // count it as cancelled. (A "started" lobby emptying is a game ending,
    // which is tracked separately in eliminate().)
    if (game?.phase === "joinable") {
      await ctx.scheduler.runAfter(0, internal.analytics.capture, {
        event: AnalyticsEvent.gameCancelled,
        distinctId: game.gameCode,
        properties: { game_code: game.gameCode },
      });
    }
    return;
  }
  if (others.some((p) => p.isHost)) return; // someone else is already host
  const next = others.find((p) => p.status === "alive") ?? others[0];
  await ctx.db.patch(next._id, { isHost: true });
}

// The core ring mechanic. Marks `victim` dead and closes the ring: whoever was
// hunting the victim inherits the victim's target and is credited the kill.
// If only two players remain alive afterward, the game ends and the winner
// (most kills) is recorded. `game` must be the started game `victim` belongs to.
async function eliminate(
  ctx: MutationCtx,
  victim: Doc<"players">,
  game: Doc<"games">
) {
  const roster = await playersInGame(ctx, game._id);
  const hunter = roster.find((p) => p.currentTarget === victim._id);

  // Relink the hunter onto the victim's target and credit them the kill.
  if (hunter) {
    await ctx.db.patch(hunter._id, {
      currentTarget: victim.currentTarget,
      kills: (hunter.kills ?? 0) + 1,
    });
  }

  // The victim is out. Clearing currentTarget removes the field. Record who got
  // them (the hunter) so the kill feed can show "<hunter> handed it to <victim>".
  await ctx.db.patch(victim._id, {
    status: "dead",
    eliminatedAt: Date.now(),
    currentTarget: undefined,
    killedBy: hunter?._id,
  });

  // End condition: the game stops with two survivors (never down to one).
  const aliveAfter = roster.filter(
    (p) => p.status === "alive" && p._id !== victim._id
  );
  if (aliveAfter.length <= 2) {
    // The game is over. Re-read the whole roster so kill counts reflect the
    // just-applied patches (the hunter just gained one), then crown the player
    // with the most kills across the ENTIRE game — not just the two survivors.
    // Outlasting the ring grants no special claim; creation order breaks ties.
    const finalRoster = await playersInGame(ctx, game._id);
    const ranked = [...finalRoster].sort(
      (a, b) =>
        (b.kills ?? 0) - (a.kills ?? 0) || a._creationTime - b._creationTime
    );
    const endedAt = Date.now();
    await ctx.db.patch(game._id, {
      phase: "ended",
      winnerId: ranked[0]?._id,
      endedAt,
    });

    // Raw atoms for analytics — averages/totals are derived in PostHog.
    await ctx.scheduler.runAfter(0, internal.analytics.capture, {
      event: AnalyticsEvent.gameEnded,
      distinctId: game.gameCode,
      properties: {
        game_code: game.gameCode,
        player_count: finalRoster.length,
        total_kills: finalRoster.reduce((sum, p) => sum + (p.kills ?? 0), 0),
        // null if startedAt was somehow never set; PostHog handles null fine.
        duration_seconds: game.startedAt
          ? Math.round((endedAt - game.startedAt) / 1000)
          : null,
      },
    });
  }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export const hostLobby = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    // One read: every existing game code. The user explicitly wants all codes
    // so we can generate against the full set in a single pass (no per-attempt
    // round-trips). Avoiding ALL codes — not just active ones — also keeps the
    // `by_gameCode` .unique() lookups conflict-free.
    const games = await ctx.db.query("games").collect();
    const used = new Set(games.map((g) => g.gameCode));

    const gameCode = pickFreeCode(used);

    const gameId = await ctx.db.insert("games", {
      gameCode,
      phase: "joinable",
    });

    const playerId = await ctx.db.insert("players", {
      gameId,
      name,
      isHost: true,
      status: "alive",
    });

    return { gameId, playerId, gameCode };
  },
});

export const joinGame = mutation({
  args: { gameCode: v.string(), name: v.string() },
  handler: async (ctx, { gameCode, name }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_gameCode", (q) => q.eq("gameCode", gameCode))
      .unique();

    if (!game) throw new ConvexError("Lobby not found. Check the code and try again.");
    if (game.phase !== "joinable") throw new ConvexError("This game has already started.");

    // Names must be unique within a lobby: they're how players refer to each
    // other (target screen, hunt circle, host kicks) once ids are kept private.
    const roster = await playersInGame(ctx, game._id);
    const wanted = name.trim().toLowerCase();
    if (roster.some((p) => p.name.trim().toLowerCase() === wanted)) {
      throw new ConvexError("That name is already taken in this lobby. Pick another.");
    }

    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      name,
      isHost: false,
      status: "alive",
    });

    return { gameId: game._id, playerId, gameCode };
  },
});

export const leaveLobby = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) return null;

    const game = await ctx.db.get(player.gameId);

    // Mid-game departure counts as an elimination: keep the record (as dead)
    // and close the ring instead of deleting, so targets stay consistent.
    if (game?.phase === "started" && player.status === "alive") {
      await eliminate(ctx, player, game);
      if (player.isHost) await transferHostAway(ctx, player);
      return null;
    }

    // Post-game departure: leaving the end screen is navigation-only. The final
    // leaderboard, kill feed, and ring graph are all computed live from the
    // player rows (getResults / getKillFeed / getHuntCircle), so deleting a row
    // here would erase that player from EVERYONE else's still-open results
    // screen. Keep the record so the final stats stay frozen for all viewers.
    if (game?.phase === "ended") return null;

    // Pre-game (or already-eliminated) leave: remove from the lobby entirely.
    await ctx.db.delete(playerId);
    if (player.isHost) await transferHostAway(ctx, player);
    return null;
  },
});

export const removePlayer = mutation({
  args: {
    callerPlayerId: v.id("players"),
    targetName: v.string(),
  },
  handler: async (ctx, { callerPlayerId, targetName }) => {
    const caller = await ctx.db.get(callerPlayerId);
    if (!caller?.isHost) {
      throw new ConvexError("Only the host can remove players.");
    }

    // Resolve the target by name within the caller's own lobby — the host never
    // learns other players' ids, so kicks are name-based.
    const roster = await playersInGame(ctx, caller.gameId);
    const target = roster.find((p) => p.name === targetName);
    if (!target) throw new ConvexError("Player is not in your lobby.");
    if (target._id === caller._id) throw new ConvexError("You can't remove yourself.");

    await ctx.db.delete(target._id);

    const game = await ctx.db.get(caller.gameId);
    if (game) {
      await ctx.scheduler.runAfter(0, internal.analytics.capture, {
        event: AnalyticsEvent.playerKicked,
        distinctId: game.gameCode,
        properties: { game_code: game.gameCode },
      });
    }
  },
});

const MIN_PLAYERS = 3;

export const startGame = mutation({
  args: { callerPlayerId: v.id("players") },
  handler: async (ctx, { callerPlayerId }) => {
    const caller = await ctx.db.get(callerPlayerId);
    if (!caller?.isHost) {
      throw new ConvexError("Only the host can start the game.");
    }

    const game = await ctx.db.get(caller.gameId);
    if (!game) throw new ConvexError("Game not found.");
    if (game.phase !== "joinable") {
      throw new ConvexError("This game has already started.");
    }

    const players = await playersInGame(ctx, caller.gameId);
    if (players.length < MIN_PLAYERS) {
      throw new ConvexError(`Need at least ${MIN_PLAYERS} players to start.`);
    }

    // Build a random Hamiltonian cycle: shuffle, then each player hunts the
    // next one in the shuffled order (last wraps to first). One secret target
    // each, every player hunted exactly once.
    const order = [...players];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    for (let i = 0; i < order.length; i++) {
      const target = order[(i + 1) % order.length];
      await ctx.db.patch(order[i]._id, {
        currentTarget: target._id,
        status: "alive",
        kills: 0,
      });
    }

    await ctx.db.patch(game._id, {
      phase: "started",
      winnerId: undefined,
      startedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.analytics.capture, {
      event: AnalyticsEvent.gameStarted,
      distinctId: game.gameCode,
      properties: { game_code: game.gameCode, player_count: players.length },
    });
    return null;
  },
});

// The victim self-reports being handed the card. Credits their hunter the kill,
// closes the ring, and ends the game if only two players remain.
export const confirmKilled = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Player not found.");

    const game = await ctx.db.get(player.gameId);
    if (!game || game.phase !== "started") {
      throw new ConvexError("The game isn't running.");
    }
    if (player.status !== "alive") return null; // already out — no-op

    await eliminate(ctx, player, game);
    return null;
  },
});
