import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StickerButton } from "../components/ui/StickerButton";
import { StickerInput } from "../components/ui/StickerInput";
import { Colors, Control, Fonts, Radius, Spacing } from "../constants/colors";
import { useLobby } from "../lobby/useLobby";
import { useRejoin } from "../lobby/useRejoin";

const LOGO = require("../../assets/images/hand-it-logo.png");

type Mode = "join" | "create";

export default function HomeScreen() {
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { hostLobby, joinGame, isLoading, error, clearError } = useLobby();
  const { isChecking } = useRejoin();

  function switchMode(next: Mode) {
    setMode(next);
    clearError();
  }

  // Drop a stale error (e.g. "name already taken") the moment the player edits a
  // field to fix it, so it doesn't linger while they retype.
  function edit(setter: (v: string) => void) {
    return (value: string) => {
      if (error) clearError();
      setter(value);
    };
  }

  const aliasOk = name.trim().length >= 2;
  const codeOk = code.trim().length === 6;
  const canSubmit = mode === "join" ? aliasOk && codeOk : aliasOk;

  function handleSubmit() {
    if (!canSubmit || isLoading) return;
    if (mode === "join") {
      joinGame(code.trim(), name.trim());
    } else {
      hostLobby(name.trim());
    }
  }

  if (isChecking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.red500} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo — the master sticker, the only illustration on the screen */}
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />

        <Text style={styles.tagline}>
          The social assassination party game.
        </Text>

        {/* Segmented control — active mode is a solid red pill */}
        <View style={styles.segment}>
          <SegmentButton
            label="Join Room"
            active={mode === "join"}
            onPress={() => switchMode("join")}
          />
          <SegmentButton
            label="Create"
            active={mode === "create"}
            onPress={() => switchMode("create")}
          />
        </View>

        {/* Fields sit directly on the dark ground — no card wrapper */}
        <View style={styles.form}>
          <StickerInput
            label="Your alias"
            required
            placeholder="e.g. Backstabber Bob"
            value={name}
            onChangeText={edit(setName)}
            maxLength={20}
            autoFocus
          />

          {mode === "join" && (
            <StickerInput
              label="Room code"
              code
              placeholder="XKCD"
              value={code}
              onChangeText={edit((t) => setCode(t.toUpperCase()))}
              maxLength={6}
              autoCapitalize="characters"
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <StickerButton
            label={mode === "join" ? "Join the Hunt" : "Create Room"}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isLoading}
          />
        </View>

        {/* How it works — a connected "hunt thread" timeline */}
        <View style={styles.how}>
          <Text style={styles.howLabel}>The Hunt</Text>
          <View style={styles.howSteps}>
            <HowStep n={1}>
              Each Player gets a different <Text style={styles.howEm}>players name assigned</Text>.
            </HowStep>
            <HowStep n={2}>
              If you hand them any item and they accept it 
              <Text style={styles.howEm}> they are eliminated</Text>.
            </HowStep>
            <HowStep n={3} last>
              The Player with the most eliminiatinations:
              <Text style={styles.howEm}> Wins the game</Text>
            </HowStep>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HowStep({
  n,
  last,
  children,
}: {
  n: number;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.howStep}>
      {/* Left rail: gold badge + the connecting "hunt thread" */}
      <View style={styles.howRail}>
        <View style={styles.howBadge}>
          <Text style={styles.howBadgeText}>{n}</Text>
        </View>
        {!last && <View style={styles.howThread} />}
      </View>
      <Text style={[styles.howText, !last && styles.howTextGap]}>
        {children}
      </Text>
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, active && styles.segBtnActive]}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Control.gutter,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxWidth: Control.screenMax,
    alignSelf: "center",
    width: "100%",
  },
  logo: {
    width: 168,
    height: 168,
    marginTop: Spacing.sm,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 260,
    marginBottom: Spacing.md + 6,
  },
  segment: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    maxWidth: 300,
    backgroundColor: Colors.bgSunken,
    borderWidth: 3,
    borderColor: Colors.ink900,
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: {
    backgroundColor: Colors.red500,
  },
  segText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  segTextActive: {
    color: Colors.textStrong,
  },
  form: {
    width: "100%",
    maxWidth: 300,
    gap: Spacing.md,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.red400,
  },
  how: {
    width: "100%",
    maxWidth: 300,
    marginTop: Spacing.xl,
    alignItems: "center",
  },
  howLabel: {
    fontFamily: Fonts.stamp,
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.gold500,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  howSteps: {
    alignSelf: "stretch",
  },
  howStep: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  howRail: {
    width: 28,
    alignItems: "center",
    marginRight: Spacing.sm + 2,
  },
  howBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold500,
    borderWidth: 2,
    borderColor: Colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  howBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.ink900,
  },
  // The vertical thread that links one kill to the next
  howThread: {
    width: 3,
    flex: 1,
    backgroundColor: Colors.gold600,
    borderRadius: 2,
    marginVertical: 4,
  },
  howText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    paddingTop: 4,
  },
  howTextGap: {
    paddingBottom: Spacing.md,
  },
  howEm: {
    fontFamily: Fonts.bodyBold,
    color: Colors.red300,
  },
});
