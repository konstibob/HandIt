// Persists the player's identity across page refreshes.
// Web-only (localStorage). If targeting native later, swap for AsyncStorage.

export type PlayerSession = {
  playerId: string;
  gameCode: string;
  playerName: string;
};

const KEY = "handit_session";

export function getPlayerSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function setPlayerSession(session: PlayerSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearPlayerSession(): void {
  localStorage.removeItem(KEY);
}

// Remembers the last target name the slot-machine reveal already played for a
// given player, so a page refresh doesn't replay the animation. The reveal only
// spins when the stored value differs from the current target — i.e. on first
// assignment or when the target is reassigned (your target got killed).

const REVEAL_KEY = "handit_revealed_target";

export function getRevealedTarget(playerId: string): string | null {
  try {
    return localStorage.getItem(`${REVEAL_KEY}:${playerId}`);
  } catch {
    return null;
  }
}

export function setRevealedTarget(playerId: string, targetName: string): void {
  try {
    localStorage.setItem(`${REVEAL_KEY}:${playerId}`, targetName);
  } catch {
    // Storage unavailable — the reveal just replays next time, no harm.
  }
}

// Remembers whether the end-of-game leaderboard reveal already played for a
// given game, so a page refresh shows the final standings instantly instead of
// replaying the animation. Keyed by game code; localStorage is per-browser, so
// each client tracks its own playback.

const RESULTS_KEY = "handit_revealed_results";

export function getRevealedResults(gameCode: string): boolean {
  try {
    return localStorage.getItem(`${RESULTS_KEY}:${gameCode}`) === "1";
  } catch {
    return false;
  }
}

export function setRevealedResults(gameCode: string): void {
  try {
    localStorage.setItem(`${RESULTS_KEY}:${gameCode}`, "1");
  } catch {
    // Storage unavailable — the reveal just replays next time, no harm.
  }
}
