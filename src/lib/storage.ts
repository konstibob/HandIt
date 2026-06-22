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
