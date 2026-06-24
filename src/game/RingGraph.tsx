import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { Avatar } from "../components/ui/Avatar";
import { Colors, Fonts, Radius } from "../constants/colors";

// The assassination ring, drawn as a directed cycle (port of TargetGraph.jsx +
// PlayerNode.jsx using react-native-svg). The living form the current cycle with
// gold "weapon" arrows; eliminated players sit as faded, edgeless nodes. Only
// dead players ever see this (it's a spoiler), gated server-side by getHuntCircle.

type CirclePlayer = { name: string; status: "alive" | "dead" };
type Edge = { from: string; to: string };

type Props = {
  circle: { players: CirclePlayer[]; edges: Edge[] } | null | undefined;
  you: string | null;
  size?: number;
  nodeSize?: number;
};

const LABEL_W = 92;

export function RingGraph({ circle, you, size = 300, nodeSize = 52 }: Props) {
  if (!circle || circle.players.length === 0) {
    return <Text style={styles.empty}>The ring isn't available yet.</Text>;
  }

  const order = orderAroundCycle(circle.players, circle.edges);
  const n = order.length;
  const indexByName = new Map(order.map((p, i) => [p.name, i]));

  const cx = size / 2;
  const cy = size / 2;
  const nodeR = nodeSize / 2;
  const R = size / 2 - nodeR - 30; // ring radius (leaves room for labels)

  const pos = order.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  // Build the curved arrows for the edges that still exist (living cycle).
  const arrows = circle.edges
    .map(({ from, to }) => {
      const fi = indexByName.get(from);
      const ti = indexByName.get(to);
      if (fi === undefined || ti === undefined || fi === ti) return null;

      const f = pos[fi];
      const t = pos[ti];
      const dx = t.x - f.x;
      const dy = t.y - f.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      const sx = f.x + ux * (nodeR + 7);
      const sy = f.y + uy * (nodeR + 7);
      const ex = t.x - ux * (nodeR + 16);
      const ey = t.y - uy * (nodeR + 16);

      // Bow toward the center for a pleasing arc.
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      const toCx = cx - mx;
      const toCy = cy - my;
      const tl = Math.hypot(toCx, toCy) || 1;
      const bow = size * 0.07;
      const qx = mx + (toCx / tl) * bow;
      const qy = my + (toCy / tl) * bow;

      return {
        d: `M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`,
        head: arrowHead(ex, ey, qx, qy),
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

      {order.map((p, i) => (
        <View
          key={p.name}
          style={[
            styles.node,
            { left: pos[i].x - LABEL_W / 2, top: pos[i].y - nodeR },
          ]}
        >
          <Avatar name={p.name} state={p.status} size={nodeSize} />
          <View
            style={[
              styles.labelPill,
              p.name === you && styles.labelPillYou,
            ]}
          >
            <Text
              style={[styles.label, p.status === "dead" && styles.labelDead]}
              numberOfLines={1}
            >
              {p.name}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Triangle points for an arrowhead whose tip is at (ex,ey), pointing along the
// direction from the curve's control point (qx,qy) to the tip.
function arrowHead(ex: number, ey: number, qx: number, qy: number): string {
  const dx = ex - qx;
  const dy = ey - qy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const size = 9;
  const bx = ex - ux * size;
  const by = ey - uy * size;
  const px = -uy;
  const py = ux;
  const w = size * 0.6;
  return `${ex},${ey} ${bx + px * w},${by + py * w} ${bx - px * w},${by - py * w}`;
}

// Reconstruct ring order by walking the edge chain, then appending any players
// not on the current cycle (the eliminated) so they still appear as nodes.
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
