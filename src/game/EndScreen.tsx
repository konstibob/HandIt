import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "../components/ui/Avatar";
import { StickerButton } from "../components/ui/StickerButton";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";
import { useLobby } from "../lobby/useLobby";
import type { PublicGame, PublicPlayer } from "../lobby/lobbyHelpers";

type Props = {
  game: PublicGame;
  players: PublicPlayer[];
  playerName: string | null;
};

// The end screen — shown to EVERYONE (alive and eliminated) once the game ends.
// Reveals the winner: the survivor with the most kills.
export function EndScreen({ game, players, playerName }: Props) {
  const { leaveLobby, isLoading } = useLobby();

  const winnerName = game.winnerName;
  const winner = winnerName
    ? players.find((p) => p.name === winnerName) ?? null
    : null;
  const iWon = winnerName != null && winnerName === playerName;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Game over</Text>

        <View style={[styles.card, styles.winnerCard]}>
          <View style={styles.crown}>
            <Text style={styles.crownText}>WINNER</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Avatar name={winnerName ?? "?"} size={120} />
          </View>
          <Text style={styles.winnerName}>{winnerName ?? "—"}</Text>
          <Text style={styles.winnerKills}>
            {winner?.kills ?? 0} {(winner?.kills ?? 0) === 1 ? "kill" : "kills"}
          </Text>
          <Text style={styles.verdict}>
            {iWon ? "That's you. You handed it to everyone." : "Outlasted the ring."}
          </Text>
        </View>

        <StickerButton
          label="Back to home"
          variant="secondary"
          onPress={leaveLobby}
          loading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.lg,
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  kicker: {
    fontFamily: Fonts.stamp,
    fontSize: 14,
    color: Colors.textFaint,
    letterSpacing: 3,
    textAlign: "center",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: Colors.bgElevated,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
  },
  winnerCard: {
    borderColor: Colors.gold500,
    shadowColor: Colors.ink900,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  crown: {
    backgroundColor: Colors.gold500,
    borderWidth: 2,
    borderColor: Colors.ink800,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  crownText: {
    fontFamily: Fonts.stamp,
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.ink900,
  },
  avatarWrap: { marginVertical: Spacing.lg },
  winnerName: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.textStrong,
    textAlign: "center",
  },
  winnerKills: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.gold500,
    marginTop: 4,
  },
  verdict: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
