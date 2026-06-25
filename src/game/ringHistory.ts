// Reconstructs how the hunt ring evolved over time, so the ring view can be
// scrubbed from the opening cycle to the current/final state.
//
// We only ever store the *current* ring (alive players' targets) plus the list
// of eliminations (each victim + who handed it to them). That's enough to replay
// the whole history: the ring only ever changes by a hunter inheriting their
// victim's target, so walking the eliminations backwards re-inserts each victim
// between their killer and the killer's target — rebuilding every earlier state,
// including the original Hamiltonian cycle.
//
// A key property of this game: relative ring order never changes — eliminations
// just skip dead nodes. So once we know the original order, every frame's edges
// are simply "each living player → the next living player clockwise". We compute
// edges that way (robust and always a clean cycle) and use the reconstruction
// only to recover the fixed order.

export type RingCircle = {
  players: { name: string; status: "alive" | "dead" }[];
  edges: { from: string; to: string }[];
};

export type RingFeedEntry = {
  victimName: string;
  killerName: string | null;
  eliminatedAt: number;
};

export type RingFrame = {
  nodes: { name: string; status: "alive" | "dead" }[]; // in fixed ring order
  edges: { from: string; to: string }[];
  // The elimination that produced this frame (null for the opening frame).
  eliminatedName: string | null;
  at: number | null;
};

export type RingHistory = {
  order: string[]; // fixed ring order (all players), for a stable layout
  frames: RingFrame[]; // [opening, after 1st out, …, current]
};

export function buildRingHistory(
  circle: RingCircle | null | undefined,
  feed: RingFeedEntry[] | undefined
): RingHistory | null {
  if (!circle || circle.players.length === 0) return null;

  const allNames = circle.players.map((p) => p.name);
  const currentAlive = new Set(
    circle.players.filter((p) => p.status === "alive").map((p) => p.name)
  );

  // Eliminations oldest-first (getKillFeed returns newest-first).
  const elims = [...(feed ?? [])].sort((a, b) => a.eliminatedAt - b.eliminatedAt);

  // Walk eliminations backwards from the current ring to rebuild the original
  // cycle: re-insert each victim between their killer and the killer's target.
  const next = new Map(circle.edges.map((e) => [e.from, e.to]));
  for (let k = elims.length - 1; k >= 0; k--) {
    const { victimName, killerName } = elims[k];
    if (killerName == null) continue; // can't place it; best-effort skip
    const killerTarget = next.get(killerName);
    next.set(killerName, victimName);
    if (killerTarget !== undefined) next.set(victimName, killerTarget);
  }

  const order = walkCycle(next, allNames);

  // Build a frame per point in time: the opening, then after each elimination.
  const frames: RingFrame[] = [];
  for (let k = 0; k <= elims.length; k++) {
    const deadByNow = new Set(elims.slice(0, k).map((e) => e.victimName));
    const nodes = order.map((name) => ({
      name,
      status: (deadByNow.has(name) ? "dead" : "alive") as "alive" | "dead",
    }));
    frames.push({
      nodes,
      edges: cycleEdges(order, (name) => !deadByNow.has(name)),
      eliminatedName: k === 0 ? null : elims[k - 1].victimName,
      at: k === 0 ? null : elims[k - 1].eliminatedAt,
    });
  }

  // Safety net: if the data was inconsistent, fall back to the live ring so the
  // last frame always matches reality.
  if (frames.length > 0) {
    const last = frames[frames.length - 1];
    last.nodes = order.map((name) => ({
      name,
      status: (currentAlive.has(name) ? "alive" : "dead") as "alive" | "dead",
    }));
    last.edges = cycleEdges(order, (name) => currentAlive.has(name));
  }

  return { order, frames };
}

// Each living node points at the next living node clockwise in the fixed order.
function cycleEdges(
  order: string[],
  isAlive: (name: string) => boolean
): { from: string; to: string }[] {
  const living = order.filter(isAlive);
  if (living.length < 2) return [];
  return living.map((name, i) => ({
    from: name,
    to: living[(i + 1) % living.length],
  }));
}

// Follow `next` from an arbitrary start to produce a single ordering of every
// name. Any name not reached by the chain (broken data) is appended at the end.
function walkCycle(next: Map<string, string>, allNames: string[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = allNames[0];
  while (cur !== undefined && !seen.has(cur)) {
    seen.add(cur);
    order.push(cur);
    cur = next.get(cur);
  }
  for (const name of allNames) {
    if (!seen.has(name)) order.push(name);
  }
  return order;
}
