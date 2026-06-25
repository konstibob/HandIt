import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RingGraph } from "./RingGraph";
import { Slider } from "../components/ui/Slider";
import {
  buildRingHistory,
  type RingCircle,
  type RingFeedEntry,
  type RingFrame,
} from "./ringHistory";
import { timeIntoGame } from "../lib/time";
import { Colors, Fonts, Spacing } from "../constants/colors";

// The ring graph plus a scrubber to replay how it changed over the game: drag
// from the opening cycle through each handoff to the current/final ring. Nodes
// hold their positions across frames (stable layout) so only the arrows and
// alive/dead states move as you scrub.

type Props = {
  circle: RingCircle | null | undefined;
  feed: RingFeedEntry[] | undefined;
  startedAt: number | null | undefined;
  you: string | null;
};

export function RingTimeline({ circle, feed, startedAt, you }: Props) {
  const history = useMemo(() => buildRingHistory(circle, feed), [circle, feed]);
  const frameCount = history?.frames.length ?? 0;

  const [idx, setIdx] = useState(0);
  // Land on the latest frame whenever the history grows (new elimination).
  useEffect(() => {
    if (frameCount > 0) setIdx(frameCount - 1);
  }, [frameCount]);

  if (!history || frameCount === 0) {
    return <RingGraph circle={circle} you={you} />;
  }

  const clamped = Math.min(idx, frameCount - 1);
  const frame = history.frames[clamped];

  return (
    <View style={styles.wrap}>
      <RingGraph
        circle={{ players: frame.nodes, edges: frame.edges }}
        order={history.order}
        you={you}
      />

      <Text style={styles.caption}>
        {frameLabel(frame, clamped, frameCount, startedAt)}
      </Text>

      {frameCount > 1 && (
        <>
          <Slider value={clamped} max={frameCount - 1} onChange={setIdx} />
          <View style={styles.scaleRow}>
            <Text style={styles.scaleText}>Start</Text>
            <Text style={styles.scaleText}>Now</Text>
          </View>
        </>
      )}
    </View>
  );
}

function frameLabel(
  frame: RingFrame,
  idx: number,
  count: number,
  startedAt: number | null | undefined
): string {
  if (idx === 0) return "The opening ring — everyone hunting";
  const who = frame.eliminatedName ?? "Someone";
  const when = frame.at != null ? ` · ${timeIntoGame(frame.at, startedAt)}` : "";
  const aliveLeft = frame.nodes.filter((nd) => nd.status === "alive").length;
  const tail = idx === count - 1 ? ` · ${aliveLeft} left` : "";
  return `${who} got handed it${when}${tail}`;
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, alignItems: "stretch" },
  caption: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  scaleRow: { flexDirection: "row", justifyContent: "space-between" },
  scaleText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
