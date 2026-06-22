import { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLobbyState } from "../../lobby/useLobbyState";
import { useLobby } from "../../lobby/useLobby";
import { PlayerRow } from "../../lobby/PlayerRow";
import { HostControls } from "../../lobby/HostControls";
import { GameScreen } from "../../game/GameScreen";
import { EndScreen } from "../../game/EndScreen";
import { getPlayerSession } from "../../lib/storage";
import { Colors, Fonts, Spacing, Sticker } from "../../constants/colors";

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const session = getPlayerSession();
  const playerName = session?.playerName ?? null;

  const { game, players, amIHost, amIInLobby, isLoading } = useLobbyState(code, playerName);
  const { leaveLobby, removePlayer, startGame, isLoading: actionLoading, error } = useLobby();

  // If there's no session, this page shouldn't be accessible — redirect home
  useEffect(() => {
    if (!session) router.replace("/");
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.red500} size="large" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lobby not found.</Text>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The same route renders the right phase — everyone is subscribed, so start
  // and end transitions happen for all players at once with no navigation.
  if (game.phase === "started") {
    return <GameScreen players={players} playerName={playerName} />;
  }
  if (game.phase === "ended") {
    return <EndScreen game={game} players={players} playerName={playerName} />;
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <Text style={styles.code}>{game.gameCode}</Text>
        <Text style={styles.playerCount}>
          {players.length} {players.length === 1 ? "player" : "players"} waiting
        </Text>
      </View>

      {/* ── Player list ── */}
      <FlatList
        data={players}
        keyExtractor={(p) => p.name}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PlayerRow
            player={item}
            isCurrentPlayer={item.name === playerName}
            viewerIsHost={amIHost}
            onRemove={(name) => removePlayer(name)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No players yet…</Text>
        }
      />

      {/* ── Error message ── */}
      {error && <Text style={styles.errorBanner}>{error}</Text>}

      {/* ── Footer actions ── */}
      <View style={styles.footer}>
        {amIHost && (
          <HostControls
            onStartGame={startGame}
            isLoading={actionLoading}
            playerCount={players.length}
          />
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={leaveLobby}
          activeOpacity={0.8}
        >
          <Text style={styles.leaveText}>Leave Lobby</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  codeLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  code: {
    fontFamily: Fonts.stamp,
    fontSize: 48,
    color: Colors.gold500,
    letterSpacing: 8,
    // Hard text shadow for the stamp feel
    textShadowColor: Colors.ink900,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  playerCount: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textFaint,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  errorBanner: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.red400,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.ink800,
  },
  leaveButton: {
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: 999,
    paddingVertical: Spacing.sm + 4,
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
  },
  leaveText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textBody,
  },
  homeButton: {
    borderRadius: 999,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bgSurface,
    borderWidth: 2,
    borderColor: Colors.ink800,
  },
  homeButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textBody,
  },
});
