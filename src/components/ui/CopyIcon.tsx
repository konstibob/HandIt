import { View } from "react-native";
import { Colors } from "../../constants/colors";

// Two overlapping "pages" — the universal copy glyph — drawn with views so it
// renders identically on web (no icon font / SF Symbols dependency) and matches
// the sticker aesthetic's hard maroon outline.

type Props = {
  color?: string;
  size?: number;
};

export function CopyIcon({ color = Colors.gold500, size = 16 }: Props) {
  const page = size * 0.72;
  return (
    <View style={{ width: size + 3, height: size + 3 }}>
      {/* back page */}
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: page,
          height: page,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 3,
        }}
      />
      {/* front page (filled so it reads as overlapping the back one) */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: page,
          height: page,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 3,
          backgroundColor: Colors.bgElevated,
        }}
      />
    </View>
  );
}
