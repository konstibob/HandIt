import { StyleSheet, Text, View } from "react-native";
import { KillFeed, type KillFeedEntry } from "./KillFeed";
import { PlayersList } from "./PlayersList";
import { Colors, Fonts, Spacing } from "../constants/colors";
import type { PublicPlayer } from "../lobby/lobbyHelpers";

// The "Game" tab: the kill feed on top, the full roster below. Visible to every
// player, alive or dead. Rendered inside GameScreen's ScrollView, so it lays out
// as plain Views (no nested scroll).

type Props = {
  players: PublicPlayer[];
  feed: KillFeedEntry[] | undefined;
  playerName: string | null;
};

export function GameInsights({ players, feed, playerName }: Props) {
  return (
    <View style={styles.wrap}>
      <Section title="Kill feed">
        <KillFeed entries={feed} />
      </Section>
      <Section title="Players">
        <PlayersList players={players} playerName={playerName} />
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  section: { gap: Spacing.sm },
  heading: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});
