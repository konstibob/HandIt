# Future changes

Planned work, not yet implemented. Notes below capture the intent plus the
current behavior and likely touchpoints so the implementation stays grounded.

---

## 1. Quitting should be a distinct action from being killed

**Problem.** Right now, leaving mid-game is treated as an elimination. In
`leaveLobby` (`convex/lobby.ts`), a mid-game departure calls `eliminate()`,
which:

- relinks the quitter's hunter onto the quitter's target, and
- **credits that hunter a kill** (`kills + 1`), and
- marks the row `status: "dead"` with `killedBy = hunter`.

So a quit is indistinguishable from a real handoff: it inflates someone's kill
count and shows up in the kill feed as `"<hunter> handed it to <quitter>"`.

**Wanted.** A quit and a kill are two separate event types. A quit must:

- still close the ring (relink the hunter onto the quitter's target so targets
  stay consistent — this part of `eliminate()` is correct and should stay), but
- **not** credit anyone a kill, and
- be recorded as a *departure*, not a handoff.

**Likely approach.**

- Distinguish the two outcomes on the player row instead of overloading
  `status: "dead"`. Options:
  - add a departure reason, e.g. `outReason: "killed" | "quit"` (and maybe
    `"kicked"` for change #3), or
  - a boolean `quit: true` alongside the existing dead state.
- Split the ring-relink logic out of `eliminate()` into a shared helper so both
  "killed" and "quit" can reuse the relink without the kill-credit. Only the
  killed path bumps `hunter.kills` and sets `killedBy`.
- The end-of-game condition (`aliveAfter.length <= 2`) should still fire on a
  quit, since the quitter no longer counts as alive.

**Schema touch.** `players` table in `convex/schema.ts` — add the reason field.

---

## 2. Show departures in the history / kill feed

**Problem.** `getKillFeed` (`convex/lobby.ts`) builds entries from every
`status === "dead"` player and renders each as a handoff. With change #1 in
place, quitters (and kicked players) need their own representation rather than
being mislabeled as kills.

**Wanted.** The feed/history should show a separate kind of entry for someone
leaving, e.g. `"<name> left the game"` (and `"<name> was kicked"` once #3
lands), visually distinct from a handoff row.

**Likely approach.**

- Carry the `outReason` from #1 through `getKillFeed`'s mapped entries (add a
  `kind: "kill" | "quit" | "kick"` to each entry).
- Render the new kinds in `KillFeed` / `KillFeedCard` (`src/game/`): a quit/kick
  row has no killer avatar and different copy/styling.
- The same entries feed the ring timeline (`RingTimeline` via
  `buildRingHistory`), so the frame label there should also read correctly for a
  departure rather than `"<name> got handed it"`.
- The static `timeIntoGame(...)` timestamp added recently applies unchanged.

---

## 3. Vote-to-kick (n−1 majority)

**Problem.** There's currently only a host-only kick (`removePlayer` in
`convex/lobby.ts`), and it deletes the row outright — fine pre-game, but there's
no peer mechanism to remove someone who has left/gone AFK mid-game, and no
democratic control independent of the host.

**Wanted.** Any player can be voted out. If **n−1** of the players vote for a
given person to be kicked (where n = current player count), that person is
removed from the game.

**Open questions to resolve before building.**

- Is `n` the count of *alive* players, or all players in the lobby? (Probably
  alive players, so the dead/quit don't dilute the threshold.)
- Does a mid-game kick count as a quit-style departure (#1 — ring relink, no
  kill credit) or its own `outReason: "kicked"`? Leaning toward its own reason
  so the feed can say `"was kicked"`.
- Can you vote pre-game, mid-game, or both? Threshold and effect likely differ.
- Do votes expire / reset (e.g. if the target acts, or after a timeout)?

**Likely approach.**

- A votes structure: either a new `kickVotes` table
  (`gameId`, `targetPlayerId`, `voterPlayerId`) for clean per-voter dedupe, or a
  `votesToKick: Id<"players">[]` array on the target's player row. A table is
  cleaner for counting and preventing double-votes.
- A `voteKick` mutation: records the caller's vote for a target (idempotent per
  voter), recomputes the count, and when it reaches `n − 1`, performs the
  removal using the same departure path as #1/#2.
- A query/return so the UI can show "X of Y votes to kick" and let players cast
  their vote, plus reflect the resulting departure in the feed (#2).
- Reuse/retire the existing host-only `removePlayer` as appropriate.
