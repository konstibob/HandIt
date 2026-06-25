import { useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Colors, Radius } from "../../constants/colors";

// A minimal discrete slider (web-first). Picks an integer step in 0…max by
// where you press/drag along the track. Kept dependency-free — React Native
// core ships no Slider, and the community one isn't installed.

type Props = {
  value: number;
  max: number; // highest selectable step (inclusive); value ∈ [0, max]
  onChange: (value: number) => void;
};

const HANDLE = 22;

export function Slider({ value, max, onChange }: Props) {
  const [width, setWidth] = useState(0);
  // Latest values for the PanResponder closure (created once on mount).
  const widthRef = useRef(0);
  const maxRef = useRef(max);
  const onChangeRef = useRef(onChange);
  maxRef.current = max;
  onChangeRef.current = onChange;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
    })
  ).current;

  function pick(x: number) {
    const w = widthRef.current;
    const m = maxRef.current;
    if (w <= 0 || m <= 0) return;
    const frac = Math.max(0, Math.min(1, x / w));
    onChangeRef.current(Math.round(frac * m));
  }

  const frac = max > 0 ? value / max : 0;
  const handleLeft = width > 0 ? frac * (width - HANDLE) : 0;

  return (
    <View style={styles.wrap} onLayout={onLayout} {...pan.panHandlers}>
      <View style={styles.track} />
      <View style={[styles.fill, { width: frac * Math.max(0, width - HANDLE) + HANDLE / 2 }]} />
      <View style={[styles.handle, { left: handleLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HANDLE + 12,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bgSunken,
    borderWidth: 2,
    borderColor: Colors.ink900,
  },
  fill: {
    position: "absolute",
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold600,
  },
  handle: {
    position: "absolute",
    width: HANDLE,
    height: HANDLE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold500,
    borderWidth: 3,
    borderColor: Colors.ink900,
  },
});
