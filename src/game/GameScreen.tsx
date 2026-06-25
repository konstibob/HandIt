import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Avatar } from "../components/ui/Avatar";
import { SegmentControl, type SegmentOption } from "../components/ui/SegmentControl";
import { StickerButton } from "../components/ui/StickerButton";
import { Toast } from "../components/ui/Toast";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";
import { getPlayerSession } from "../lib/storage";
import type { PublicPlayer } from "../lobby/lobbyHelpers";
import { useLobby } from "../lobby/useLobby";
import { GameInsights } from "./GameInsights";
import { RingTimeline } from "./RingTimeline";
import { TargetReveal } from "./TargetReveal";

type Props = {
  players: PublicPlayer[];
  playerName: string | null;
  gameCode: string;
};

type Tab = "target" | "game" | "ring";

// The core gameplay screen (port of designSystem TargetScreen.jsx). Tabbed:
// alive players get [Target | Game]; when you die the Target tab gives way to a
// dead-only [Game | Ring]. "Game" is the shared insights view (kill feed +
// roster); "Ring" is the spoiler graph, only ever shown to the dead.
//
// The secret target is NOT in the public roster — it's fetched via myTarget,
// keyed by the caller's own (private) player id, so no one else can read it.
export function GameScreen({ players, playerName, gameCode }: Props) {
  const { confirmKilled, leaveLobby, isLoading } = useLobby();
  const [armed, setArmed] = useState(false);
  const [tab, setTab] = useState<Tab>("target");

  const session = getPlayerSession();
  const playerId = (session?.playerId ?? null) as Id<"players"> | null;

  const me = players.find((p) => p.name === playerName) ?? null;
  const aliveCount = players.filter((p) => p.status === "alive").length;
  const myKills = me?.kills ?? 0;
  const dead = me?.status === "dead";

  const targetResult = useQuery(
    api.lobby.myTarget,
    playerId ? { playerId } : "skip"
  );
  const targetName = targetResult?.targetName ?? null;

  // "You have a new target!" toast. Your target only changes when you eliminate
  // it (you inherit their target), so a target swap mid-session means a kill.
  // We track the previous name and fire the toast on a name→different-name
  // change — never on the first assignment (null→name) or a refresh (the ref
  // resets to null, so the freshly-loaded target reads as the first value).
  const [showNewTarget, setShowNewTarget] = useState(false);
  const prevTargetRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevTargetRef.current;
    if (targetName && prev && targetName !== prev) {
      setShowNewTarget(true);
    }
    if (targetName) prevTargetRef.current = targetName;
  }, [targetName]);

  // Kill feed is public; the ring is spoiler-gated server-side (null unless dead).
  const feed = useQuery(api.lobby.getKillFeed, { gameCode });
  const huntCircle = useQuery(
    api.lobby.getHuntCircle,
    dead && playerId ? { playerId } : "skip"
  );

  // Tabs swap on death. If the active tab is no longer valid (e.g. you were on
  // "Target" when you died), fall back to the first available tab.
  const tabs: SegmentOption<Tab>[] = dead
    ? [{ key: "game", label: "Game" }, { key: "ring", label: "Ring" }]
    : [{ key: "target", label: "Target" }, { key: "game", label: "Game" }];

  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) setTab(tabs[0].key);
  }, [dead]);

  return (
    <SafeAreaView style={styles.safe}>
      {showNewTarget && (
        <Toast
          message="You have a new target!"
          onHide={() => setShowNewTarget(false)}
        />
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Stats row — always visible */}
        <View style={styles.statsRow}>
          <StatCard value={aliveCount} label="Still alive" color={Colors.alive} />
          <StatCard value={myKills} label="Your kills" color={Colors.gold500} />
        </View>

        {dead && (
          <View style={styles.outBanner}>
            <Text style={styles.outBannerTitle}>You're out</Text>
            <Text style={styles.outBannerCopy}>
              You got handed it. Sit tight and watch how the ring closes.
            </Text>
          </View>
        )}

        <SegmentControl options={tabs} value={tab} onChange={setTab} />

        {/* ── Target tab (alive only) ── */}
        {tab === "target" && !dead && (
          <>
            <View style={[styles.card, styles.cardRaised, styles.cardRed]}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>YOUR TARGET</Text>
              </View>
              {targetName ? (
                <TargetReveal
                  names={players.map((p) => p.name)}
                  finalName={targetName}
                  playerId={playerId}
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
                Give them an Item. If they accept it, they're out.
              </Text>
            </View>

            {/* Victim self-report — the important mechanic */}
            <View style={[styles.card, styles.cardFlat]}>
              <Text style={styles.handedTitle}>Got handed an Item by your Killer?</Text>
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

            <View style={[styles.card, styles.cardFlat, styles.warnCard]}>
              <Text style={styles.warnText}>
                <Text style={styles.warnStrong}>Someone is hunting you too. </Text>
                Trust noone.
              </Text>
            </View>
          </>
        )}

        {/* ── Game tab (everyone): kill feed + roster ── */}
        {tab === "game" && (
          <GameInsights
            players={players}
            feed={feed?.entries}
            startedAt={feed?.startedAt}
            playerName={playerName}
          />
        )}

        {/* ── Ring tab (dead only): the spoiler graph ── */}
        {tab === "ring" && dead && (
          <RingTimeline
            circle={huntCircle}
            feed={feed?.entries}
            startedAt={feed?.startedAt}
            you={playerName}
          />
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

  outBanner: {
    backgroundColor: Colors.bgElevated,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.dead,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  outBannerTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.textStrong,
  },
  outBannerCopy: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },

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
