import { describe, expect, test } from "vitest";
import { buildRingHistory, type RingCircle, type RingFeedEntry } from "./ringHistory";

// Edges as a comparable set of "from>to" strings.
const edgeSet = (edges: { from: string; to: string }[]) =>
  new Set(edges.map((e) => `${e.from}>${e.to}`));

const deadNames = (nodes: { name: string; status: string }[]) =>
  nodes
    .filter((n) => n.status === "dead")
    .map((n) => n.name)
    .sort();

describe("buildRingHistory", () => {
  test("returns null without a ring", () => {
    expect(buildRingHistory(null, [])).toBeNull();
    expect(buildRingHistory({ players: [], edges: [] }, [])).toBeNull();
  });

  test("a fresh ring (no eliminations) is a single opening frame", () => {
    const circle: RingCircle = {
      players: ["A", "B", "C"].map((name) => ({ name, status: "alive" })),
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "A" },
      ],
    };
    const history = buildRingHistory(circle, [])!;
    expect(history.frames).toHaveLength(1);
    expect(history.order).toEqual(["A", "B", "C"]);
    expect(deadNames(history.frames[0].nodes)).toEqual([]);
  });

  test("replays the full history and rebuilds the opening cycle", () => {
    // Opening ring A→B→C→D→A. B is handed it by A, then D by C, leaving A & C.
    const circle: RingCircle = {
      players: [
        { name: "A", status: "alive" },
        { name: "B", status: "dead" },
        { name: "C", status: "alive" },
        { name: "D", status: "dead" },
      ],
      edges: [
        { from: "A", to: "C" },
        { from: "C", to: "A" },
      ],
    };
    // getKillFeed returns newest-first.
    const feed: RingFeedEntry[] = [
      { victimName: "D", killerName: "C", eliminatedAt: 200 },
      { victimName: "B", killerName: "A", eliminatedAt: 100 },
    ];

    const history = buildRingHistory(circle, feed)!;

    // Order reconstructed back to the original Hamiltonian cycle.
    expect(history.order).toEqual(["A", "B", "C", "D"]);
    expect(history.frames).toHaveLength(3);

    // Opening: everyone alive, full 4-cycle.
    expect(deadNames(history.frames[0].nodes)).toEqual([]);
    expect(edgeSet(history.frames[0].edges)).toEqual(
      edgeSet([
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "D" },
        { from: "D", to: "A" },
      ])
    );

    // After B is out: B dead, ring skips it (A now hunts C).
    expect(deadNames(history.frames[1].nodes)).toEqual(["B"]);
    expect(edgeSet(history.frames[1].edges)).toEqual(
      edgeSet([
        { from: "A", to: "C" },
        { from: "C", to: "D" },
        { from: "D", to: "A" },
      ])
    );
    expect(history.frames[1].eliminatedName).toBe("B");
    expect(history.frames[1].at).toBe(100);

    // Final: B & D out, the surviving 2-cycle matches the live ring.
    expect(deadNames(history.frames[2].nodes)).toEqual(["B", "D"]);
    expect(edgeSet(history.frames[2].edges)).toEqual(
      edgeSet([
        { from: "A", to: "C" },
        { from: "C", to: "A" },
      ])
    );
  });
});
