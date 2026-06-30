import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getUserId } from "../lib/storage";
import { friendlyError } from "../lib/errors";

// Wraps all lobby mutations with loading/error state and navigation.
//
// Identity is now game-scoped: a device can be in many lobbies at once, so the
// per-game action functions take the relevant playerId explicitly (the caller
// resolves it via useMyGames().findGame(code)). hostLobby/joinGame stamp every
// new player row with this device's single userId token so myGames can find it.

export function useLobby() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hostLobbyMutation  = useMutation(api.lobby.hostLobby);
  const joinGameMutation   = useMutation(api.lobby.joinGame);
  const leaveLobbyMutation = useMutation(api.lobby.leaveLobby);
  const removePlayerMutation = useMutation(api.lobby.removePlayer);
  const startGameMutation  = useMutation(api.lobby.startGame);
  const confirmKilledMutation = useMutation(api.lobby.confirmKilled);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setIsLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(friendlyError(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function hostLobby(name: string, roomName: string) {
    // The server allocates a guaranteed-unique code; we send the alias + room
    // name + our token.
    const result = await run(() =>
      hostLobbyMutation({ name, roomName, userId: getUserId() })
    );
    if (!result) return;
    router.push(`/lobby/${result.gameCode}`);
  }

  async function joinGame(code: string, name: string) {
    const result = await run(() =>
      joinGameMutation({
        gameCode: code.toUpperCase().trim(),
        name,
        userId: getUserId(),
      })
    );
    if (!result) return;
    router.push(`/lobby/${result.gameCode}`);
  }

  // Leave a specific lobby (mid-game = counts as elimination; pre-game = removed;
  // post-game = navigation only — all handled server-side). Returns to the home
  // screen, which now shows the rest of your lobbies.
  async function leaveLobby(playerId: Id<"players">) {
    await run(() => leaveLobbyMutation({ playerId }));
    router.replace("/");
  }

  async function removePlayer(callerPlayerId: Id<"players">, targetName: string) {
    await run(() => removePlayerMutation({ callerPlayerId, targetName }));
  }

  async function startGame(callerPlayerId: Id<"players">) {
    // No navigation needed — the lobby screen swaps to the game view when the
    // subscribed game.phase flips to "started".
    await run(() => startGameMutation({ callerPlayerId }));
  }

  async function confirmKilled(playerId: Id<"players">) {
    await run(() => confirmKilledMutation({ playerId }));
  }

  return {
    hostLobby,
    joinGame,
    leaveLobby,
    removePlayer,
    startGame,
    confirmKilled,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
