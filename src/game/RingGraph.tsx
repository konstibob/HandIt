import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { Avatar } from "../components/ui/Avatar";
import { Colors, Fonts, Radius } from "../constants/colors";

// The assassination ring, drawn as a directed cycle (port of TargetGraph.jsx +
// PlayerNode.jsx using react-native-svg). The living form the current cycle with
// gold "weapon" arrows; eliminated players sit as faded, edgeless nodes.
//
// The hunt always flows one way — each living player hunts the next living
// player clockwise — so every edge is a concentric clockwise ARC that hugs the
// ring and rounds cleanly over any dead nodes in between. Passing a fixed
// `order` keeps node positions stable across time (used by the history slider);
// without it, the order is reconstructed from the current cycle.

type CirclePlayer = { name: string; status: "alive" | "dead" };
type Edge = { from: string; to: string };

type Props = {
  circle: { players: CirclePlayer[]; edges: Edge[] } | null | undefined;
  you: string | null;
  // Fixed ring order (names) for a stable layout; defaults to the live cycle.
  order?: string[];
  size?: number;
  nodeSize?: number;
};

const LABEL_W = 92;
const TAU = Math.PI * 2;

export function RingGraph({ circle, you, order, size = 300, nodeSize = 52 }: Props) {
  if (!circle || circle.players.length === 0) {
    return <Text style={styles.empty}>The ring isn't available yet.</Text>;
  }

  const statusByName = new Map(circle.players.map((p) => [p.name, p.status]));
  // Names in ring order: the caller's fixed order, or reconstructed from edges.
  const names = order ?? orderAroundCycle(circle.players, circle.edges).map((p) => p.name);
  const n = names.length;

  const cx = size / 2;
  const cy = size / 2;
  const nodeR = nodeSize / 2;
  const R = size / 2 - nodeR - 34; // ring radius (leaves room for labels)

  const angle = (i: number) => -Math.PI / 2 + (i * TAU) / n;
  const pos = names.map((_, i) => ({
    x: cx + R * Math.cos(angle(i)),
    y: cy + R * Math.sin(angle(i)),
  }));

  // Arrowhead geometry, in radians of arc length so the tip lands precisely on
  // the target node's rim and the gold line stops at the head's base (never
  // poking through the triangle).
  const HEAD_LEN = 11; // px, tip → base along the arc
  const maxPad = (TAU / n) * 0.42; // keep a single-step arc from inverting
  const startPad = Math.min((nodeR + 7) / R, maxPad); // gap leaving the source node
  const tipPad = Math.min((nodeR + 2) / R, maxPad); // tip just off the target rim
  const headPad = HEAD_LEN / R; // angular length of the arrowhead

  // The hunt is a single directed cycle through the LIVING players only: each
  // living node points at the next living node clockwise, wrapping the last back
  // to the first. Dead players keep their slot as faded nodes but are skipped:
  //  - adjacent living nodes are joined by a concentric arc that hugs the ring;
  //  - when one or more dead nodes sit between them, we draw a STRAIGHT line
  //    from source to target, cutting across the gap so the arrow clearly goes
  //    "A → C" instead of bowing over the dead node it replaces.
  const arrows = livingCycleEdges(names, statusByName)
    .map(({ fi, ti }) => {
      const steps = (((ti - fi) % n) + n) % n; // clockwise slots spanned
      if (steps === 1) {
        const aF = angle(fi) + startPad;
        const aTip = angle(ti) - tipPad; // where the arrowhead tip lands
        const aEnd = aTip - headPad; // where the gold line ends (head's base)
        const sweep = (((aEnd - aF) % TAU) + TAU) % TAU; // clockwise span
        const large = sweep > Math.PI ? 1 : 0;

        const sx = cx + R * Math.cos(aF);
        const sy = cy + R * Math.sin(aF);
        const ex = cx + R * Math.cos(aEnd);
        const ey = cy + R * Math.sin(aEnd);
        const tipX = cx + R * Math.cos(aTip);
        const tipY = cy + R * Math.sin(aTip);

        return {
          d: `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`,
          head: arrowHead(tipX, tipY, ex, ey),
        };
      }

      // Skips over dead node(s): a straight chord from source rim to target rim.
      const dx = pos[ti].x - pos[fi].x;
      const dy = pos[ti].y - pos[fi].y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      const sx = pos[fi].x + ux * (nodeR + 7);
      const sy = pos[fi].y + uy * (nodeR + 7);
      const tipX = pos[ti].x - ux * (nodeR + 2); // tip on the target rim
      const tipY = pos[ti].y - uy * (nodeR + 2);
      const ex = tipX - ux * HEAD_LEN; // line ends at the head's base
      const ey = tipY - uy * HEAD_LEN;

      return {
        d: `M ${sx} ${sy} L ${ex} ${ey}`,
        head: arrowHead(tipX, tipY, ex, ey),
      };
    });

  return (
    <View style={[styles.canvas, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* ink casing under each gold edge — the sticker outline on the line */}
        {arrows.map((a, i) => (
          <Path
            key={`c${i}`}
            d={a.d}
            fill="none"
            stroke={Colors.ink900}
            strokeWidth={8}
            strokeLinecap="round"
          />
        ))}
        {arrows.map((a, i) => (
          <Path
            key={`e${i}`}
            d={a.d}
            fill="none"
            stroke={Colors.gold500}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
        {arrows.map((a, i) => (
          <Polygon
            key={`h${i}`}
            points={a.head}
            fill={Colors.gold500}
            stroke={Colors.ink900}
            strokeWidth={1}
          />
        ))}
      </Svg>

      {names.map((name, i) => {
        const status = statusByName.get(name) ?? "dead";
        return (
          <View
            key={name}
            style={[
              styles.node,
              { left: pos[i].x - LABEL_W / 2, top: pos[i].y - nodeR },
            ]}
          >
            <Avatar name={name} state={status} size={nodeSize} />
            <View style={[styles.labelPill, name === you && styles.labelPillYou]}>
              <Text
                style={[styles.label, status === "dead" && styles.labelDead]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Triangle points for an arrowhead whose tip is exactly at (tipX,tipY) and whose
// base is centred at (baseX,baseY) — the point where the gold line ends. The
// base width spreads perpendicular to the tip→base direction.
function arrowHead(
  tipX: number,
  tipY: number,
  baseX: number,
  baseY: number,
): string {
  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // unit perpendicular
  const py = dx / len;
  const w = 6.5; // half-width of the base
  return `${tipX},${tipY} ${baseX + px * w},${baseY + py * w} ${baseX - px * w},${baseY - py * w}`;
}

// The living players in ring order, each paired with the next living player
// (wrapping around). Fewer than two living players means no hunt — no arrows.
function livingCycleEdges(
  names: string[],
  statusByName: Map<string, "alive" | "dead">,
): { fi: number; ti: number }[] {
  const living = names
    .map((name, i) => ({ name, i }))
    .filter((x) => statusByName.get(x.name) === "alive");
  if (living.length < 2) return [];
  return living.map((cur, k) => ({
    fi: cur.i,
    ti: living[(k + 1) % living.length].i,
  }));
}

// Reconstruct ring order by walking the edge chain, then appending any players
// not on the current cycle (the eliminated) so they still appear as nodes. Only
// used as a fallback when the caller doesn't supply a stable `order`.
function orderAroundCycle(players: CirclePlayer[], edges: Edge[]): CirclePlayer[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  const next = new Map(edges.map((e) => [e.from, e.to]));

  const order: CirclePlayer[] = [];
  const seen = new Set<string>();

  const start = edges[0]?.from ?? players[0]?.name;
  let cur: string | undefined = start;
  while (cur && byName.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    order.push(byName.get(cur)!);
    cur = next.get(cur);
  }

  for (const p of players) {
    if (!seen.has(p.name)) order.push(p);
  }
  return order;
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  node: {
    position: "absolute",
    width: LABEL_W,
    alignItems: "center",
    gap: 6,
  },
  labelPill: {
    backgroundColor: Colors.bgBase,
    borderWidth: 2,
    borderColor: Colors.ink900,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: LABEL_W,
  },
  labelPillYou: {
    borderColor: Colors.gold500,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textBody,
  },
  labelDead: {
    color: Colors.textFaint,
    textDecorationLine: "line-through",
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textFaint,
    textAlign: "center",
    paddingVertical: 24,
  },
});
