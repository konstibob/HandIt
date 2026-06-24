import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/ui/Avatar";
import { Colors, Fonts, Spacing } from "../constants/colors";

// Slot-machine reveal for the secret target. On mount it spins through every
// player's name — the Avatar recolours per name, so it reads like a real reel —
// then eases to a stop on the assigned target with a little pop. Plays once.

type Props = {
  // All names to spin through while rolling.
  names: string[];
  // The name to land on.
  finalName: string;
};

export function TargetReveal({ names, finalName }: Props) {
  // Start on something other than the answer so the result isn't spoiled.
  const [display, setDisplay] = useState(
    () => names.find((n) => n !== finalName) ?? finalName
  );
  const [settled, setSettled] = useState(false);
  const pop = useRef(new Animated.Value(1)).current;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !finalName) return;
    startedRef.current = true;

    const pool = names.length > 1 ? names : [finalName];
    let i = 0;
    let delay = 55; // fast at first
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tick = () => {
      if (cancelled) return;
      setDisplay(pool[i % pool.length]);
      i++;
      delay *= 1.18; // ease out — each frame a little slower

      if (delay < 380) {
        timers.push(setTimeout(tick, delay));
      } else {
        // Land on the target and pop.
        setDisplay(finalName);
        setSettled(true);
        Animated.sequence([
          Animated.timing(pop, {
            toValue: 1.18,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.spring(pop, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    timers.push(setTimeout(tick, delay));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [finalName, names]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.avatarWrap, { transform: [{ scale: pop }] }]}
      >
        <Avatar name={display} size={104} />
      </Animated.View>
      <Text style={[styles.name, !settled && styles.nameRolling]}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  avatarWrap: { marginVertical: Spacing.lg },
  name: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.textStrong,
    textAlign: "center",
  },
  nameRolling: {
    color: Colors.gold500,
  },
});
