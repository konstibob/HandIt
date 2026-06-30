import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Leaderboard } from "./Leaderboard";
import { KillFeed } from "./KillFeed";
import { RingTimeline } from "./RingTimeline";
import { BackButton } from "../components/ui/BackButton";
import { StickerButton } from "../components/ui/StickerButton";
import {
  SegmentControl,
  type SegmentOption,
} from "../components/ui/SegmentControl";
import { Colors, Fonts, Spacing } from "../constants/colors";
import { useLobby } from "../lobby/useLobby";
import type { Id } from "../../convex/_generated/dataModel";

type Props = {
  playerName: string | null;
  playerId: Id<"players"> | null;
  gameCode: string;
};

type Tab = "results" | "feed" | "ring";

// Shown to EVERYONE (alive and eliminated) once the game ends. The headline +
// leaderboard crown the player with the most kills overall (ties = co-winners);
// surviving to the final two carries no special weight. The kill feed and the
// (now-public) ring graph stay browsable, and anyone can head back home.
export function EndScreen({ playerName, playerId, gameCode }: Props) {
  const { leaveLobby, isLoading } = useLobby();
  const [tab, setTab] = useState<Tab>("results");

  const results = useQuery(api.lobby.getResults, { gameCode });
  const feed = useQuery(api.lobby.getKillFeed, { gameCode });
  // The ring is gated server-side; once the game has ended it's shown to all.
  const huntCircle = useQuery(
    api.lobby.getHuntCircle,
    playerId ? { playerId } : "skip"
  );

  const tabs: SegmentOption<Tab>[] = [
    { key: "results", label: "Results" },
    { key: "feed", label: "Kill feed" },
    { key: "ring", label: "Ring" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <BackButton />
        </View>

        <Text style={styles.kicker}>Game over</Text>
        <Text style={styles.headline}>
          {winnerLine(results?.winnerNames, results?.players)}
        </Text>

        <SegmentControl options={tabs} value={tab} onChange={setTab} />

        {tab === "results" &&
          (results ? (
            <Leaderboard
              rows={results.players}
              playerName={playerName}
              gameCode={gameCode}
            />
          ) : (
            <Text style={styles.loading}>Tallying the handoffs…</Text>
          ))}

        {tab === "feed" && (
          <KillFeed entries={feed?.entries} startedAt={feed?.startedAt} />
        )}

        {tab === "ring" && (
          <RingTimeline
            circle={huntCircle}
            feed={feed?.entries}
            startedAt={feed?.startedAt}
            you={playerName}
          />
        )}

        <StickerButton
          label="Back to home"
          variant="secondary"
          onPress={() => playerId && leaveLobby(playerId)}
          loading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// "Mia wins with 4 kills" / "Mia & Jonas tie for the win — 3 kills each".
function winnerLine(
  names: string[] | undefined,
  players: { name: string; kills: number }[] | undefined
): string {
  if (!names || names.length === 0) return "The hunt is over.";
  const kills = players?.find((p) => p.name === names[0])?.kills ?? 0;
  const tally = `${kills} ${kills === 1 ? "kill" : "kills"}`;
  if (names.length === 1) return `${names[0]} wins with ${tally}.`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(", ");
  return `${rest} & ${last} tie for the win — ${tally} each.`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
    flexGrow: 1,
  },
  topBar: { alignSelf: "stretch" },
  kicker: {
    fontFamily: Fonts.stamp,
    fontSize: 13,
    color: Colors.textFaint,
    letterSpacing: 3,
    textAlign: "center",
    textTransform: "uppercase",
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textStrong,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: Spacing.xs,
  },
  loading: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textFaint,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
