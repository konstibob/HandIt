import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Avatar } from "../components/ui/Avatar";
import { TargetReveal } from "./TargetReveal";
import { StickerButton } from "../components/ui/StickerButton";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";
import { useLobby } from "../lobby/useLobby";
import { getPlayerSession } from "../lib/storage";
import type { PublicPlayer } from "../lobby/lobbyHelpers";
import type { Id } from "../../convex/_generated/dataModel";

type Props = {
  players: PublicPlayer[];
  playerName: string | null;
};

// The core gameplay screen (port of designSystem TargetScreen.jsx). Shows the
// player their secret target and the running stats. Unlike the design mock, the
// big destructive action is the VICTIM confirming their own elimination —
// "I was killed" — which credits their hunter and tightens the ring.
//
// The secret target is NOT in the public roster — it's fetched via myTarget,
// keyed by the caller's own (private) player id, so no one else can read it.
export function GameScreen({ players, playerName }: Props) {
  const { confirmKilled, leaveLobby, isLoading } = useLobby();
  const [armed, setArmed] = useState(false);

  const session = getPlayerSession();
  const playerId = (session?.playerId ?? null) as Id<"players"> | null;
  const targetResult = useQuery(
    api.lobby.myTarget,
    playerId ? { playerId } : "skip"
  );
  const targetName = targetResult?.targetName ?? null;

  const me = players.find((p) => p.name === playerName) ?? null;
  const aliveCount = players.filter((p) => p.status === "alive").length;
  const myKills = me?.kills ?? 0;
  const dead = me?.status === "dead";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard value={aliveCount} label="Still alive" color={Colors.alive} />
          <StatCard value={myKills} label="Your kills" color={Colors.gold500} />
        </View>

        {dead ? (
          <View style={[styles.card, styles.cardRaised, styles.cardDead]}>
            <View style={styles.avatarWrap}>
              <Avatar name={me?.name ?? "?"} state="dead" size={104} />
            </View>
            <Text style={styles.targetName}>You got handed it</Text>
            <Text style={styles.copy}>
              You're out of the game. Sit tight and watch how the ring closes.
            </Text>
          </View>
        ) : (
          <>
            {/* Target card */}
            <View style={[styles.card, styles.cardRaised, styles.cardRed]}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>YOUR TARGET</Text>
              </View>
              {targetName ? (
                <TargetReveal
                  names={players.map((p) => p.name)}
                  finalName={targetName}
                />
              ) : (
                <>
                  <View style={styles.avatarWrap}>
                    <Avatar name="?" size={104} />
                  </View>
                  <Text style={styles.targetName}>—</Text>
                </>
              )}
              <Text style={styles.copy}>
                Slip them the card without anyone watching. They confirm the
                handoff on their own phone.
              </Text>
            </View>

            {/* Victim self-report — the important mechanic */}
            <View style={[styles.card, styles.cardFlat]}>
              <Text style={styles.handedTitle}>Got handed the card?</Text>
              <Text style={styles.copySmall}>
                If someone slipped you the card, you're out — mark it so your
                hunter gets the credit.
              </Text>
              <StickerButton
                label={armed ? "Tap again — I'm out" : "I was killed"}
                onPress={() => {
                  if (!armed) {
                    setArmed(true);
                    return;
                  }
                  confirmKilled();
                }}
                loading={isLoading}
              />
              {armed && (
                <TouchableOpacity onPress={() => setArmed(false)}>
                  <Text style={styles.cancel}>No, cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Warning */}
            <View style={[styles.card, styles.cardFlat, styles.warnCard]}>
              <Text style={styles.warnText}>
                <Text style={styles.warnStrong}>Someone is hunting you too. </Text>
                Trust no handshake.
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={leaveLobby}
          activeOpacity={0.8}
        >
          <Text style={styles.leaveText}>{dead ? "Leave game" : "Quit (you're out)"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.card, styles.cardFlat, styles.statCard]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
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
  statsRow: { flexDirection: "row", gap: Spacing.sm },

  card: {
    backgroundColor: Colors.bgSurface,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  cardRaised: {
    backgroundColor: Colors.bgElevated,
    shadowColor: Colors.ink900,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardFlat: {},
  cardRed: { borderColor: Colors.red500, alignItems: "center", paddingVertical: Spacing.lg },
  cardDead: { borderColor: Colors.dead, alignItems: "center", paddingVertical: Spacing.lg },

  statCard: { flex: 1, alignItems: "center", paddingVertical: Spacing.sm + 4 },
  statValue: { fontFamily: Fonts.display, fontSize: 30 },
  statLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },

  badge: {
    backgroundColor: Colors.red500,
    borderWidth: 2,
    borderColor: Colors.ink800,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: Fonts.stamp,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.textStrong,
  },
  avatarWrap: { marginVertical: Spacing.lg },
  targetName: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.textStrong,
    textAlign: "center",
  },
  copy: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: Spacing.sm,
  },

  handedTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textStrong,
    marginBottom: 4,
  },
  copySmall: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  cancel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textFaint,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  warnCard: { flexDirection: "row", alignItems: "center", borderColor: Colors.gold600 },
  warnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, lineHeight: 18, flex: 1 },
  warnStrong: { fontFamily: Fonts.bodyBold, color: Colors.textStrong },

  leaveButton: {
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm + 4,
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    marginTop: Spacing.sm,
  },
  leaveText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.textMuted },
});
