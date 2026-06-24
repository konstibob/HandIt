import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/ui/Avatar";
import { Colors, Fonts, Spacing } from "../constants/colors";
import { getRevealedTarget, setRevealedTarget } from "../lib/storage";

// Slot-machine reveal for the secret target. It spins through every player's
// name — the Avatar recolours per name, so it reads like a real reel — then
// eases to a stop on the assigned target with a little pop.
//
// It plays once per *target*, not once per mount: a page refresh shows the
// already-revealed target instantly (no replay), but when the target changes
// — first assignment, or a reassignment after your target gets killed — it
// spins again. The last-revealed target is persisted per player so refreshes
// can tell "same target" from "new target".

type Props = {
  // All names to spin through while rolling.
  names: string[];
  // The name to land on.
  finalName: string;
  // The viewer's own player id — used to remember which target was last
  // revealed so a refresh doesn't replay the spin. When absent, always spins.
  playerId?: string | null;
};

export function TargetReveal({ names, finalName, playerId }: Props) {
  // Whether this exact target was already revealed in a previous session/mount.
  const alreadyRevealed =
    playerId != null && getRevealedTarget(playerId) === finalName;

  // Start on something other than the answer so the result isn't spoiled —
  // unless we've already revealed it, in which case show it straight away.
  const [display, setDisplay] = useState(() =>
    alreadyRevealed ? finalName : names.find((n) => n !== finalName) ?? finalName
  );
  const [settled, setSettled] = useState(alreadyRevealed);
  const pop = useRef(new Animated.Value(1)).current;
  // The target we've already started spinning for, so the spin re-fires when
  // the target changes (reassignment) but never twice for the same target.
  const spunForRef = useRef<string | null>(alreadyRevealed ? finalName : null);

  useEffect(() => {
    if (!finalName) return;
    // Already showing this target (revealed earlier, or just span for it).
    if (spunForRef.current === finalName) return;
    // Refresh landed on a target we'd already revealed — show it, don't spin.
    if (playerId != null && getRevealedTarget(playerId) === finalName) {
      spunForRef.current = finalName;
      setDisplay(finalName);
      setSettled(true);
      return;
    }
    spunForRef.current = finalName;
    setSettled(false);

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
        // Remember it so a later refresh shows it without replaying the spin.
        if (playerId != null) setRevealedTarget(playerId, finalName);
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
    // Intentionally not depending on `names`: it's a fresh array each render,
    // and re-running mid-spin would cancel the in-flight reel. We only need the
    // name pool at the moment a spin starts, which the closure already captures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalName, playerId]);

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
