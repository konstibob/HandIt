// Persists the player's identity across page refreshes.
// Web-only (localStorage). If targeting native later, swap for AsyncStorage.

// ─── User identity token ────────────────────────────────────────────────────
//
// A single, stable, random token that identifies THIS device/user — not a token
// per lobby. Every player row we create server-side is stamped with it, so the
// `myGames` query can list every lobby this user is in from this one value. This
// replaces the old per-game `handit_session`.

const USER_KEY = "handit_user_id";

function randomToken(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual generator below
  }
  // Fallback for environments without crypto.randomUUID.
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Returns the user token, lazily creating and persisting one on first call.
export function getUserId(): string {
  try {
    const existing = localStorage.getItem(USER_KEY);
    if (existing) return existing;
    const fresh = randomToken();
    localStorage.setItem(USER_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable — return an ephemeral token so the app still
    // works for this page load (it just won't persist across refreshes).
    return randomToken();
  }
}

export function clearUserId(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // nothing to do
  }
}

// ─── Legacy single-session migration ─────────────────────────────────────────
//
// Before multi-lobby, the only stored identity was one `handit_session` holding
// a single { playerId, gameCode, playerName }. On first load after the upgrade
// we read it once so we can adopt that in-progress game into the new userId
// model (via the claimPlayer mutation), then drop the legacy key.

const LEGACY_KEY = "handit_session";

export function getLegacySession(): { playerId: string } | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { playerId?: string };
    return parsed?.playerId ? { playerId: parsed.playerId } : null;
  } catch {
    return null;
  }
}

export function clearLegacySession(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // nothing to do
  }
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
