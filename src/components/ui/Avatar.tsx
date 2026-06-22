import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts } from "../../constants/colors";

// Hand It — Avatar. The player circle (port of designSystem Avatar.jsx).
// ALIVE shows a venom-green ring; DEAD desaturates to bone and stamps an X.
// Colours are derived deterministically from the name so each player keeps a
// stable look without us storing one.

const PALETTE = [
  "#e62b22", // blood red
  "#f8ba41", // hilt gold
  "#46c46e", // venom green
  "#4aa3e0", // sky
  "#a06cd5", // violet
  "#ef6f9c", // pink
  "#f2913d", // orange
  "#2bb1a8", // teal
];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  name: string;
  size?: number;
  state?: "alive" | "dead";
  ring?: boolean;
};

export function Avatar({ name, size = 88, state = "alive", ring = true }: Props) {
  const dead = state === "dead";
  const base = dead ? Colors.dead : colorFor(name);

  return (
    <View style={{ width: size, height: size }}>
      {ring && (
        <View
          style={[
            styles.ring,
            {
              borderRadius: size,
              borderColor: dead ? Colors.bone600 : Colors.alive,
              borderStyle: dead ? "dashed" : "solid",
            },
          ]}
        />
      )}
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size, backgroundColor: base },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {initialsOf(name)}
        </Text>
        {dead && (
          <Text style={[styles.x, { fontSize: size * 0.62 }]}>✕</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderWidth: 3,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.ink900,
  },
  initials: {
    fontFamily: Fonts.display,
    color: Colors.textStrong,
  },
  x: {
    position: "absolute",
    fontFamily: Fonts.stamp,
    color: Colors.textStrong,
    textShadowColor: Colors.ink900,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
});
