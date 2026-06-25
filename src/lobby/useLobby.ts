import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getPlayerSession, setPlayerSession, clearPlayerSession } from "../lib/storage";
import { friendlyError } from "../lib/errors";

// Wraps all lobby mutations with loading/error state and navigation.
// Each action reads the player session from localStorage as the caller identity.

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

  async function hostLobby(name: string) {
    // The server allocates a guaranteed-unique code; we just send the name.
    const result = await run(() => hostLobbyMutation({ name }));
    if (!result) return;
    setPlayerSession({ playerId: result.playerId, gameCode: result.gameCode, playerName: name });
    router.push(`/lobby/${result.gameCode}`);
  }

  async function joinGame(code: string, name: string) {
    const result = await run(() =>
      joinGameMutation({ gameCode: code.toUpperCase().trim(), name })
    );
    if (!result) return;
    setPlayerSession({ playerId: result.playerId, gameCode: result.gameCode, playerName: name });
    router.push(`/lobby/${result.gameCode}`);
  }

  async function leaveLobby() {
    const session = getPlayerSession();
    if (!session) return;
    await run(() => leaveLobbyMutation({ playerId: session.playerId as Id<"players"> }));
    clearPlayerSession();
    router.replace("/");
  }

  async function removePlayer(targetName: string) {
    const session = getPlayerSession();
    if (!session) return;
    await run(() =>
      removePlayerMutation({
        callerPlayerId: session.playerId as Id<"players">,
        targetName,
      })
    );
  }

  async function startGame() {
    const session = getPlayerSession();
    if (!session) return;
    // No navigation needed — the lobby screen swaps to the game view when the
    // subscribed game.phase flips to "started".
    await run(() => startGameMutation({ callerPlayerId: session.playerId as Id<"players"> }));
  }

  async function confirmKilled() {
    const session = getPlayerSession();
    if (!session) return;
    await run(() => confirmKilledMutation({ playerId: session.playerId as Id<"players"> }));
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
