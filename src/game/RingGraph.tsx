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
  const indexByName = new Map(names.map((name, i) => [name, i]));

  const cx = size / 2;
  const cy = size / 2;
  const nodeR = nodeSize / 2;
  const R = size / 2 - nodeR - 34; // ring radius (leaves room for labels)

  const angle = (i: number) => -Math.PI / 2 + (i * TAU) / n;
  const pos = names.map((_, i) => ({
    x: cx + R * Math.cos(angle(i)),
    y: cy + R * Math.sin(angle(i)),
  }));

  // Angular gap so each arc starts/ends just outside its node, clamped so a
  // single-step arc never inverts on itself.
  const pad = Math.min((nodeR + 7) / R, (TAU / n) * 0.42);

  const arrows = circle.edges
    .map(({ from, to }) => {
      const fi = indexByName.get(from);
      const ti = indexByName.get(to);
      if (fi === undefined || ti === undefined || fi === ti) return null;

      const aF = angle(fi) + pad;
      const aT = angle(ti) - pad;
      const sweep = (((aT - aF) % TAU) + TAU) % TAU; // clockwise span
      const sx = cx + R * Math.cos(aF);
      const sy = cy + R * Math.sin(aF);
      const ex = cx + R * Math.cos(aT);
      const ey = cy + R * Math.sin(aT);
      const large = sweep > Math.PI ? 1 : 0;

      // Arrowhead along the clockwise tangent at the arc's end (sweep flag 1).
      const tx = -Math.sin(aT);
      const ty = Math.cos(aT);
      return {
        d: `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`,
        head: arrowHead(ex, ey, tx, ty),
      };
    })
    .filter((a): a is { d: string; head: string } => a !== null);

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

// Triangle points for an arrowhead whose tip is at (ex,ey), pointing along the
// unit-ish direction (ux,uy).
function arrowHead(ex: number, ey: number, ux: number, uy: number): string {
  const len = Math.hypot(ux, uy) || 1;
  const dx = ux / len;
  const dy = uy / len;
  const size = 11;
  const bx = ex - dx * size;
  const by = ey - dy * size;
  const px = -dy;
  const py = dx;
  const w = size * 0.62;
  return `${ex},${ey} ${bx + px * w},${by + py * w} ${bx - px * w},${by - py * w}`;
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
