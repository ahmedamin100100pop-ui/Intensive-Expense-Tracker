import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useLanguage } from "@/context/LanguageContext";
import { useSecurity } from "@/context/SecurityContext";

const PIN_LENGTH = 4;

type Step = "create" | "confirm";

function useShake() {
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const shake = () => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming( 10, { duration: 60 }),
        withTiming( -8, { duration: 60 }),
        withTiming(  8, { duration: 60 }),
        withTiming(  0, { duration: 60 }),
      ),
      1,
    );
  };
  return { style, shake };
}

// ── Keypad key ────────────────────────────────────────────────────────────────

function Key({ label, sub, onPress }: { label: string | React.ReactNode; sub?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.key} onPress={onPress} activeOpacity={0.6}>
      {typeof label === "string"
        ? <Text style={styles.keyLabel}>{label}</Text>
        : label}
      {sub ? <Text style={styles.keySub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PINSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isChanging?: boolean;
}

export function PINSetupModal({ visible, onClose, onSuccess, isChanging = false }: PINSetupModalProps) {
  const { t } = useLanguage();
  const { setupPin, verifyPin } = useSecurity();

  const [step, setStep]         = useState<Step>("create");
  const [firstPin, setFirstPin] = useState("");
  const [entered, setEntered]   = useState("");
  const [error, setError]       = useState("");

  const { style: shakeStyle, shake } = useShake();

  const reset = useCallback(() => {
    setStep("create");
    setFirstPin("");
    setEntered("");
    setError("");
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const handleDigit = useCallback(async (d: string) => {
    const next = entered + d;
    setEntered(next);
    setError("");

    if (next.length < PIN_LENGTH) return;

    if (step === "create") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFirstPin(next);
      setEntered("");
      setStep("confirm");
      return;
    }

    // Confirm step
    if (next === firstPin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setupPin(next);
      reset();
      onSuccess();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
      setEntered("");
      setError(t("pinMismatch"));
      // Go back to create step after showing error
      setTimeout(() => {
        setStep("create");
        setFirstPin("");
        setError("");
      }, 1200);
    }
  }, [entered, step, firstPin, setupPin, shake, reset, onSuccess, t]);

  const handleDelete = () => {
    setEntered((prev) => prev.slice(0, -1));
    setError("");
  };

  const title = step === "create"
    ? (isChanging ? t("changePIN") : t("setupPIN"))
    : t("confirmPIN");
  const subtitle = step === "create" ? t("setupPINSub") : t("confirmPINSub");

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => (
    <View
      key={i}
      style={[
        styles.dot,
        i < entered.length ? styles.dotFilled : styles.dotEmpty,
      ]}
    />
  ));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.root}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, { backgroundColor: "#fff" }]} />
          <View style={[styles.stepLine, { backgroundColor: step === "confirm" ? "#fff" : "rgba(255,255,255,0.25)" }]} />
          <View style={[styles.stepDot, { backgroundColor: step === "confirm" ? "#fff" : "rgba(255,255,255,0.25)" }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={step === "confirm" ? "lock-check" : "lock-outline"}
              size={26}
              color="#fff"
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Dots */}
        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {dots}
        </Animated.View>

        {/* Error */}
        <Text style={styles.errorText}>{error || " "}</Text>

        {/* Keypad */}
        <View style={styles.keypad}>
          <View style={styles.keyRow}>
            <Key label="1" onPress={() => handleDigit("1")} />
            <Key label="2" sub="ABC" onPress={() => handleDigit("2")} />
            <Key label="3" sub="DEF" onPress={() => handleDigit("3")} />
          </View>
          <View style={styles.keyRow}>
            <Key label="4" sub="GHI" onPress={() => handleDigit("4")} />
            <Key label="5" sub="JKL" onPress={() => handleDigit("5")} />
            <Key label="6" sub="MNO" onPress={() => handleDigit("6")} />
          </View>
          <View style={styles.keyRow}>
            <Key label="7" sub="PQRS" onPress={() => handleDigit("7")} />
            <Key label="8" sub="TUV" onPress={() => handleDigit("8")} />
            <Key label="9" sub="WXYZ" onPress={() => handleDigit("9")} />
          </View>
          <View style={styles.keyRow}>
            <View style={[styles.key, { backgroundColor: "transparent" }]} />
            <Key label="0" onPress={() => handleDigit("0")} />
            <TouchableOpacity style={styles.key} onPress={handleDelete} disabled={entered.length === 0} activeOpacity={0.6}>
              <MaterialCommunityIcons
                name="backspace-outline"
                size={22}
                color={entered.length > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A1035",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },

  closeBtn: { position: "absolute", top: 20, right: 20 },

  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 40, height: 2, marginHorizontal: 6 },

  header: { alignItems: "center", marginBottom: 36 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8, textAlign: "center", paddingHorizontal: 24 },

  dotsRow: { flexDirection: "row", gap: 18, marginBottom: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotEmpty: { borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: "#fff" },

  errorText: { color: "#FF6B6B", fontSize: 13, fontWeight: "600", marginBottom: 28, minHeight: 20 },

  keypad: { width: "100%", maxWidth: 320, paddingHorizontal: 20 },
  keyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  key: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  keyLabel: { color: "#fff", fontSize: 26, fontWeight: "300" },
  keySub: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginTop: 1 },
});
