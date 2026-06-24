/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const modules = import.meta.glob("./**/*.ts");

type T = ReturnType<typeof convexTest>;
type JoinResult = { gameId: Id<"games">; playerId: Id<"players">; gameCode: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

// Create a game: the first name hosts, the rest join. Returns the game id and
// each player's join result in order (index 0 is the host).
async function makeGame(t: T, names: string[]) {
  const host = (await t.mutation(api.lobby.hostLobby, { name: names[0] })) as JoinResult;
  const players: JoinResult[] = [host];
  for (const name of names.slice(1)) {
    players.push(
      (await t.mutation(api.lobby.joinGame, {
        gameCode: host.gameCode,
        name,
      })) as JoinResult
    );
  }
  return { gameId: host.gameId, gameCode: host.gameCode, players };
}

function readPlayers(t: T, gameId: Id<"games">): Promise<Doc<"players">[]> {
  return t.run((ctx: MutationCtx) =>
    ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect()
  );
}

function readGame(t: T, gameId: Id<"games">): Promise<Doc<"games"> | null> {
  return t.run((ctx: MutationCtx) => ctx.db.get(gameId));
}

const hunterOf = (players: Doc<"players">[], victimId: Id<"players">) =>
  players.find((p) => p.currentTarget === victimId);

// ── Lobby basics ───────────────────────────────────────────────────────────────

describe("lobby", () => {
  let t: T;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  test("hostLobby creates a joinable game and a host player", async () => {
    const { gameId, players } = await makeGame(t, ["Alice"]);
    const game = await readGame(t, gameId);
    expect(game?.phase).toBe("joinable");
    expect(game?.gameCode).toHaveLength(6);

    const roster = await readPlayers(t, gameId);
    expect(roster).toHaveLength(1);
    expect(roster[0].isHost).toBe(true);
    expect(roster[0].status).toBe("alive");
  });

  test("joinGame adds players to the same game", async () => {
    const { gameId } = await makeGame(t, ["Alice", "Bob", "Cara"]);
    const roster = await readPlayers(t, gameId);
    expect(roster).toHaveLength(3);
    expect(roster.filter((p) => p.isHost)).toHaveLength(1);
  });

  test("joinGame rejects an unknown code", async () => {
    await expect(
      t.mutation(api.lobby.joinGame, { gameCode: "ZZZZZZ", name: "Bob" })
    ).rejects.toThrow();
  });

  test("each hosted game gets a distinct code", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const r = (await t.mutation(api.lobby.hostLobby, { name: "x" })) as JoinResult;
      codes.add(r.gameCode);
    }
    expect(codes.size).toBe(25);
  });

  test("leaving pre-game removes the player", async () => {
    const { gameId, players } = await makeGame(t, ["Alice", "Bob", "Cara"]);
    await t.mutation(api.lobby.leaveLobby, { playerId: players[2].playerId });
    const roster = await readPlayers(t, gameId);
    expect(roster).toHaveLength(2);
    expect(roster.find((p) => p._id === players[2].playerId)).toBeUndefined();
  });

  test("when the host leaves pre-game, host transfers", async () => {
    const { gameId, players } = await makeGame(t, ["Alice", "Bob", "Cara"]);
    await t.mutation(api.lobby.leaveLobby, { playerId: players[0].playerId });
    const roster = await readPlayers(t, gameId);
    expect(roster).toHaveLength(2);
    expect(roster.filter((p) => p.isHost)).toHaveLength(1);
  });

  test("only the host can remove players", async () => {
    const { players } = await makeGame(t, ["Alice", "Bob", "Cara"]);
    await expect(
      t.mutation(api.lobby.removePlayer, {
        callerPlayerId: players[1].playerId, // Bob, not host
        targetName: "Cara",
      })
    ).rejects.toThrow();
  });

  test("the host removes a player by name", async () => {
    const { gameId, players } = await makeGame(t, ["Alice", "Bob", "Cara"]);
    await t.mutation(api.lobby.removePlayer, {
      callerPlayerId: players[0].playerId, // Alice, host
      targetName: "Cara",
    });
    const roster = await readPlayers(t, gameId);
    expect(roster.map((p) => p.name).sort()).toEqual(["Alice", "Bob"]);
  });

  test("joinGame rejects a duplicate name (case-insensitive)", async () => {
    const { gameCode } = await makeGame(t, ["Alice", "Bob"]);
    await expect(
      t.mutation(api.lobby.joinGame, { gameCode, name: "  alice " })
    ).rejects.toThrow();
  });
});

// ── Starting the game ────────────────────────────────────────────────────────

describe("startGame", () => {
  let t: T;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  test("rejects callers who aren't the host", async () => {
    const { players } = await makeGame(t, ["Alice", "Bob", "Cara"]);
    await expect(
      t.mutation(api.lobby.startGame, { callerPlayerId: players[1].playerId })
    ).rejects.toThrow();
  });

  test("rejects starting with fewer than 3 players", async () => {
    const { players } = await makeGame(t, ["Alice", "Bob"]);
    await expect(
      t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId })
    ).rejects.toThrow();
  });

  test("assigns one valid Hamiltonian cycle of targets", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D", "E"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);

    // Everyone alive, no kills, hunting someone who isn't themselves.
    for (const p of roster) {
      expect(p.status).toBe("alive");
      expect(p.kills).toBe(0);
      expect(p.currentTarget).toBeDefined();
      expect(p.currentTarget).not.toBe(p._id);
    }

    // Each player is targeted exactly once (a permutation).
    const targets = roster.map((p) => p.currentTarget);
    expect(new Set(targets).size).toBe(roster.length);

    // Following the chain from anyone visits everyone and loops back — i.e. it
    // is a single cycle, not two smaller loops.
    const byId = new Map(roster.map((p) => [p._id, p]));
    let cur = roster[0];
    const visited = new Set<string>();
    for (let i = 0; i < roster.length; i++) {
      visited.add(cur._id);
      cur = byId.get(cur.currentTarget!)!;
    }
    expect(visited.size).toBe(roster.length);
    expect(cur._id).toBe(roster[0]._id);
  });

  test("can't join a game that already started", async () => {
    const { gameCode, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });
    await expect(
      t.mutation(api.lobby.joinGame, { gameCode, name: "Late" })
    ).rejects.toThrow();
  });
});

// ── Elimination & ending ─────────────────────────────────────────────────────

describe("confirmKilled", () => {
  let t: T;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  test("credits the hunter, relinks the ring, marks the victim dead", async () => {
    // 4 players so one elimination leaves 3 alive (no game-end yet).
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    let roster = await readPlayers(t, gameId);
    const victim = roster[0];
    const hunter = hunterOf(roster, victim._id)!;
    const victimsTarget = victim.currentTarget;

    await t.mutation(api.lobby.confirmKilled, { playerId: victim._id });

    roster = await readPlayers(t, gameId);
    const hunterAfter = roster.find((p) => p._id === hunter._id)!;
    const victimAfter = roster.find((p) => p._id === victim._id)!;

    expect(hunterAfter.kills).toBe(1);
    expect(hunterAfter.currentTarget).toBe(victimsTarget); // inherited
    expect(victimAfter.status).toBe("dead");
    expect(victimAfter.currentTarget).toBeUndefined();

    const game = await readGame(t, gameId);
    expect(game?.phase).toBe("started"); // 3 still alive
  });

  test("ends the game at two survivors; the hunter wins it", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const victim = roster[0];
    const hunter = hunterOf(roster, victim._id)!;

    await t.mutation(api.lobby.confirmKilled, { playerId: victim._id });

    const game = await readGame(t, gameId);
    expect(game?.phase).toBe("ended");
    expect(game?.winnerId).toBe(hunter._id);

    const after = await readPlayers(t, gameId);
    expect(after.find((p) => p._id === hunter._id)?.kills).toBe(1);
  });

  test("winner is the survivor with the most kills", async () => {
    // 4 players; make one hunter take two kills in a row, then the game ends.
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    let roster = await readPlayers(t, gameId);
    let byId = new Map(roster.map((p) => [p._id, p]));
    const killer = roster[0];

    // First kill: eliminate the killer's current target.
    const firstTarget = byId.get(killer.currentTarget!)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: firstTarget._id });

    // After relink the killer inherits the next target; eliminate it too.
    roster = await readPlayers(t, gameId);
    byId = new Map(roster.map((p) => [p._id, p]));
    const killerNow = byId.get(killer._id)!;
    const secondTarget = byId.get(killerNow.currentTarget!)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: secondTarget._id });

    const game = await readGame(t, gameId); // 2 alive now → ended
    expect(game?.phase).toBe("ended");
    expect(game?.winnerId).toBe(killer._id);

    const after = await readPlayers(t, gameId);
    expect(after.find((p) => p._id === killer._id)?.kills).toBe(2);
  });

  test("winner is the most-killing player even if they were eliminated", async () => {
    // The star racks up two kills, then gets handed the card themselves before
    // the game ends — they still win, because winning is purely most kills.
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D", "E"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    let roster = await readPlayers(t, gameId);
    let byId = new Map(roster.map((p) => [p._id, p]));
    const star = roster[0];

    // Two kills in a row (the star inherits each victim's target).
    const first = byId.get(star.currentTarget!)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: first._id });
    roster = await readPlayers(t, gameId);
    byId = new Map(roster.map((p) => [p._id, p]));
    const second = byId.get(byId.get(star._id)!.currentTarget!)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: second._id });

    // Now the star's own hunter takes them out → two survivors, game ends.
    await t.mutation(api.lobby.confirmKilled, { playerId: star._id });

    const game = await readGame(t, gameId);
    expect(game?.phase).toBe("ended");
    expect(game?.winnerId).toBe(star._id);

    const after = await readPlayers(t, gameId);
    const starAfter = after.find((p) => p._id === star._id)!;
    expect(starAfter.kills).toBe(2);
    expect(starAfter.status).toBe("dead"); // crowned despite being out
  });

  test("throws if the game isn't running", async () => {
    const { players } = await makeGame(t, ["A", "B", "C"]);
    // Not started yet.
    await expect(
      t.mutation(api.lobby.confirmKilled, { playerId: players[1].playerId })
    ).rejects.toThrow();
  });

  test("is a no-op if the player is already out", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const victim = roster[0];
    await t.mutation(api.lobby.confirmKilled, { playerId: victim._id });

    // Calling again on the dead player should not throw or double-count.
    await expect(
      t.mutation(api.lobby.confirmKilled, { playerId: victim._id })
    ).resolves.toBeNull();

    const after = await readPlayers(t, gameId);
    const deaths = after.filter((p) => p.status === "dead");
    expect(deaths).toHaveLength(1);
  });

  test("leaving mid-game counts as an elimination (ring closes, record kept)", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    let roster = await readPlayers(t, gameId);
    const victim = roster[0];
    const hunter = hunterOf(roster, victim._id)!;
    const victimsTarget = victim.currentTarget;

    await t.mutation(api.lobby.leaveLobby, { playerId: victim._id });

    roster = await readPlayers(t, gameId);
    const victimAfter = roster.find((p) => p._id === victim._id);
    const hunterAfter = roster.find((p) => p._id === hunter._id)!;

    expect(roster).toHaveLength(4); // not deleted — kept as dead
    expect(victimAfter?.status).toBe("dead");
    expect(hunterAfter.kills).toBe(1);
    expect(hunterAfter.currentTarget).toBe(victimsTarget);
  });
});

// ── Privacy & authorization (the secret ring must not leak) ─────────────────────

describe("query privacy", () => {
  let t: T;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  test("getLobby never exposes player ids or secret targets", async () => {
    const { gameCode, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const lobby = await t.query(api.lobby.getLobby, { gameCode });
    expect(lobby).not.toBeNull();
    for (const p of lobby!.players) {
      expect(p).not.toHaveProperty("_id");
      expect(p).not.toHaveProperty("currentTarget");
      expect(p).not.toHaveProperty("gameId");
      expect(Object.keys(p).sort()).toEqual(["isHost", "kills", "name", "status"]);
    }
    expect(lobby!.game).not.toHaveProperty("winnerId");
  });

  test("myTarget returns your target only while alive in a running game", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const me = roster.find((p) => p._id === players[0].playerId)!;
    const expectedTarget = roster.find((p) => p._id === me.currentTarget)!;

    const result = await t.query(api.lobby.myTarget, { playerId: me._id });
    expect(result.targetName).toBe(expectedTarget.name);
  });

  test("myTarget yields nothing once you're dead", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const victim = roster[0];
    await t.mutation(api.lobby.confirmKilled, { playerId: victim._id });

    const result = await t.query(api.lobby.myTarget, { playerId: victim._id });
    expect(result.targetName).toBeNull();
  });

  test("getHuntCircle is withheld from a living player mid-game", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const alive = roster.find((p) => p.status === "alive")!;
    const circle = await t.query(api.lobby.getHuntCircle, { playerId: alive._id });
    expect(circle).toBeNull();
  });

  test("getHuntCircle is revealed to a dead player", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const victim = roster[0];
    await t.mutation(api.lobby.confirmKilled, { playerId: victim._id });

    const circle = await t.query(api.lobby.getHuntCircle, { playerId: victim._id });
    expect(circle).not.toBeNull();
    expect(circle!.players).toHaveLength(4);
    // Edges are by name, and only living hunters still point at someone.
    for (const e of circle!.edges) {
      expect(typeof e.from).toBe("string");
      expect(typeof e.to).toBe("string");
    }
  });

  test("getHuntCircle is revealed to everyone once the game has ended", async () => {
    const { gameId, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    await t.mutation(api.lobby.confirmKilled, { playerId: roster[0]._id });

    const game = await readGame(t, gameId);
    expect(game?.phase).toBe("ended");

    // A still-alive survivor can now see the circle because the game ended.
    const survivor = (await readPlayers(t, gameId)).find((p) => p.status === "alive")!;
    const circle = await t.query(api.lobby.getHuntCircle, { playerId: survivor._id });
    expect(circle).not.toBeNull();
  });
});

// ── End-of-game standings ───────────────────────────────────────────────────────

describe("getResults", () => {
  let t: T;
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  test("is withheld until the game has ended", async () => {
    const { gameCode, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });
    expect(await t.query(api.lobby.getResults, { gameCode })).toBeNull();
  });

  test("returns kill-sorted standings, flags the winner, and leaks no ids", async () => {
    const { gameId, gameCode, players } = await makeGame(t, ["A", "B", "C"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    const roster = await readPlayers(t, gameId);
    const victim = roster[0];
    const hunter = hunterOf(roster, victim._id)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: victim._id });

    const results = await t.query(api.lobby.getResults, { gameCode });
    expect(results).not.toBeNull();
    expect(results!.players).toHaveLength(3);

    // The lone killer tops the board and is the sole winner.
    expect(results!.players[0].name).toBe(hunter.name);
    expect(results!.players[0].kills).toBe(1);
    expect(results!.players[0].isWinner).toBe(true);
    expect(results!.winnerNames).toEqual([hunter.name]);

    const victimRow = results!.players.find((p) => p.name === victim.name)!;
    expect(victimRow.survivedSeconds).not.toBeNull();

    for (const p of results!.players) {
      expect(Object.keys(p).sort()).toEqual([
        "isWinner",
        "kills",
        "name",
        "status",
        "survivedSeconds",
      ]);
    }
  });

  test("a kill tie yields co-winners", async () => {
    const { gameId, gameCode, players } = await makeGame(t, ["A", "B", "C", "D"]);
    await t.mutation(api.lobby.startGame, { callerPlayerId: players[0].playerId });

    // Two different players each take one kill, leaving them tied at the end.
    let roster = await readPlayers(t, gameId);
    let byId = new Map(roster.map((p) => [p._id, p]));
    const k1 = roster[0];
    const firstTarget = byId.get(k1.currentTarget!)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: firstTarget._id });

    roster = await readPlayers(t, gameId);
    byId = new Map(roster.map((p) => [p._id, p]));
    const mid = byId.get(byId.get(k1._id)!.currentTarget!)!; // k1 now hunts mid
    const midTarget = byId.get(mid.currentTarget!)!;
    await t.mutation(api.lobby.confirmKilled, { playerId: midTarget._id });

    const game = await readGame(t, gameId);
    expect(game?.phase).toBe("ended");

    const results = await t.query(api.lobby.getResults, { gameCode });
    expect(results!.winnerNames.sort()).toEqual([k1.name, mid.name].sort());
    const winners = results!.players.filter((p) => p.isWinner);
    expect(winners).toHaveLength(2);
    expect(winners.every((w) => w.kills === 1)).toBe(true);
  });
});
