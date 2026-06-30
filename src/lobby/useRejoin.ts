import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getUserId, getLegacySession, clearLegacySession } from "../lib/storage";
import { useMyGames } from "./useMyGames";

// Runs on the home screen. Two jobs:
//
// 1. One-shot legacy migration: if a pre-multi-lobby `handit_session` is still in
//    localStorage, adopt that in-progress game into the new userId model so it's
//    not lost, then drop the legacy key.
//
// 2. Smart rejoin: if the user is in exactly ONE active (non-ended) game, drop
//    them straight back into it (the old behavior, which most players expect). If
//    they're in two or more, stay on the home screen so they can pick from the
//    "Your Lobbys" list.

// `suppressJump` is set when the user explicitly navigated to the lobbies list
// (the in-game back button) — in that case we must NOT bounce them back into
// their single active game, even though the usual rule would.
export function useRejoin(suppressJump = false) {
  const router = useRouter();
  const claimPlayer = useMutation(api.lobby.claimPlayer);
  const { activeGames, isLoading } = useMyGames();
  const [migrationDone, setMigrationDone] = useState(false);

  // 1. Migration (once on mount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const legacy = getLegacySession();
      if (legacy) {
        try {
          await claimPlayer({
            playerId: legacy.playerId as Id<"players">,
            userId: getUserId(),
          });
        } catch {
          // Row gone or already owned — nothing to adopt, just clear the key.
        }
        clearLegacySession();
      }
      if (!cancelled) setMigrationDone(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Rejoin shortcut for a single active game (unless we were told to stay on
  //    the lobbies list).
  useEffect(() => {
    if (suppressJump || !migrationDone || isLoading) return;
    if (activeGames.length === 1) {
      router.replace(`/lobby/${activeGames[0].gameCode}`);
    }
  }, [suppressJump, migrationDone, isLoading, activeGames, router]);

  // Keep the home screen in its loading state until we know enough to decide.
  const isChecking = !migrationDone || isLoading;

  return { isChecking };
}
