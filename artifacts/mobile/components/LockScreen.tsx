import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { PINSetupModal } from "@/components/PINSetupModal";
import { SecurityQuestionModal } from "@/components/SecurityQuestionModal";
import { useLanguage } from "@/context/LanguageContext";
import { useSecurity } from "@/context/SecurityContext";

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;

// ── Shake animation ───────────────────────────────────────────────────────────

function useShake() {
  const offset = useSharedValue(0);
  const style  = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const shake  = () => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming( 10, { duration: 60 }),
        withTiming(-8,  { duration: 60 }),
        withTiming(  8, { duration: 60 }),
        withTiming( 0,  { duration: 60 }),
      ),
      1,
    );
  };
  return { style, shake };
}

// ── Keypad button ─────────────────────────────────────────────────────────────

function Key({
  label,
  sub,
  onPress,
  disabled = false,
}: {
  label: string | React.ReactNode;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.key, disabled && styles.keyDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      {typeof label === "string" ? (
        <Text style={styles.keyLabel}>{label}</Text>
      ) : (
        label
      )}
      {sub ? <Text style={styles.keySub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

// ── Lock screen ───────────────────────────────────────────────────────────────

export function LockScreen() {
  const { verifyPin, unlock, authenticateWithBiometric, isBiometricEnabled, isBiometricAvailable, hasSecurityQuestion } = useSecurity();
  const { t, language } = useLanguage();
  const appName = language === "ar" ? "رشيد" : "Rasheed";
  const appTagline = language === "ar"
    ? "عقلك الثاني لإدارة مصروفاتك المالية"
    : "Your simple money advisor";

  const [entered, setEntered]         = useState("");
  const [error, setError]             = useState("");
  const [attempts, setAttempts]       = useState(0);
  const [locked, setLocked]           = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const countdownRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showForgotPIN, setShowForgotPIN]   = useState(false);
  const [showPINReset, setShowPINReset]     = useState(false);

  const { style: shakeStyle, shake } = useShake();

  const showBiometric = isBiometricEnabled && isBiometricAvailable;
  const isRTL = language === "ar";

  // ── Biometric tap ───────────────────────────────────────────────────────

  const handleBiometric = useCallback(async () => {
    await authenticateWithBiometric();
  }, [authenticateWithBiometric]);

  // ── Digit entry ─────────────────────────────────────────────────────────

  const handleDigit = useCallback(async (d: string) => {
    if (locked) return;
    const next = entered + d;
    setEntered(next);

    if (next.length < PIN_LENGTH) return;

    // verify
    const ok = await verifyPin(next);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      unlock();
      return;
    }

    // wrong
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake();
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setEntered("");

    if (newAttempts >= MAX_ATTEMPTS) {
      setLocked(true);
      setError(t("tooManyAttempts"));
      let secs = 30;
      setCountdown(secs);
      countdownRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(countdownRef.current!);
          setLocked(false);
          setAttempts(0);
          setError("");
        }
      }, 1000);
    } else {
      setError(t("wrongPIN"));
    }
  }, [locked, entered, attempts, verifyPin, shake, t]);

  // Clean up on unmount
  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleDelete = useCallback(() => {
    setEntered((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  // ── Dots ────────────────────────────────────────────────────────────────

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => (
    <View
      key={i}
      style={[
        styles.dot,
        i < entered.length ? styles.dotFilled : styles.dotEmpty,
      ]}
    />
  ));

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock" size={28} color="#fff" />
        </View>
        <Text style={styles.appName}>{appName}</Text>
        <Text style={styles.subtitle}>
          {locked ? t("tooManyAttempts") : appTagline}
        </Text>
      </View>

      {/* Dots */}
      <Animated.View style={[styles.dotsRow, shakeStyle]}>
        {dots}
      </Animated.View>

      {/* Error / countdown */}
      <Text style={styles.errorText}>
        {locked
          ? t("attemptsRemaining", { count: countdown }) + "s"
          : error
            ? error + (attempts > 0 && attempts < MAX_ATTEMPTS
              ? `  (${MAX_ATTEMPTS - attempts} ${t("attemptsLeft")})`
              : "")
            : " "
        }
      </Text>

      {/* Forgot PIN */}
      {hasSecurityQuestion && !locked && (
        <TouchableOpacity onPress={() => setShowForgotPIN(true)} activeOpacity={0.6} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>{t("forgotPIN")}</Text>
        </TouchableOpacity>
      )}

      {/* Keypad */}
      <View style={styles.keypad}>
        {/* Row 1 */}
        <View style={styles.keyRow}>
          <Key label="1" onPress={() => handleDigit("1")} disabled={locked} />
          <Key label="2" sub="ABC" onPress={() => handleDigit("2")} disabled={locked} />
          <Key label="3" sub="DEF" onPress={() => handleDigit("3")} disabled={locked} />
        </View>
        {/* Row 2 */}
        <View style={styles.keyRow}>
          <Key label="4" sub="GHI" onPress={() => handleDigit("4")} disabled={locked} />
          <Key label="5" sub="JKL" onPress={() => handleDigit("5")} disabled={locked} />
          <Key label="6" sub="MNO" onPress={() => handleDigit("6")} disabled={locked} />
        </View>
        {/* Row 3 */}
        <View style={styles.keyRow}>
          <Key label="7" sub="PQRS" onPress={() => handleDigit("7")} disabled={locked} />
          <Key label="8" sub="TUV" onPress={() => handleDigit("8")} disabled={locked} />
          <Key label="9" sub="WXYZ" onPress={() => handleDigit("9")} disabled={locked} />
        </View>
        {/* Row 4 */}
        <View style={styles.keyRow}>
          {/* Biometric or empty */}
          {showBiometric ? (
            <TouchableOpacity style={styles.key} onPress={handleBiometric} activeOpacity={0.6}>
              <MaterialCommunityIcons name="fingerprint" size={26} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          ) : (
            <View style={[styles.key, { backgroundColor: "transparent" }]} />
          )}
          <Key label="0" onPress={() => handleDigit("0")} disabled={locked} />
          {/* Delete */}
          <TouchableOpacity
            style={styles.key}
            onPress={handleDelete}
            disabled={entered.length === 0}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons
              name="backspace-outline"
              size={22}
              color={entered.length > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot PIN - Security Question recovery */}
      <SecurityQuestionModal
        mode="verify"
        visible={showForgotPIN}
        onClose={() => setShowForgotPIN(false)}
        onVerified={() => { setShowForgotPIN(false); setShowPINReset(true); }}
      />

      {/* PIN Reset after security question answered */}
      <PINSetupModal
        visible={showPINReset}
        onClose={() => setShowPINReset(false)}
        onSuccess={() => { setShowPINReset(false); unlock(); }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A1035",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },

  header: { alignItems: "center", marginBottom: 40 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  appName: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 6 },

  dotsRow: { flexDirection: "row", gap: 18, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotEmpty: { borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: "#fff" },

  errorText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 36,
    minHeight: 20,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  keypad: { width: "100%", maxWidth: 320, paddingHorizontal: 20 },
  keyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  key: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  keyDisabled: { opacity: 0.35 },
  keyLabel: { color: "#fff", fontSize: 26, fontWeight: "300" },
  keySub: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginTop: 1 },
  forgotBtn: { marginBottom: 20 },
  forgotText: { color: "rgba(255,255,255,0.4)", fontSize: 13, textDecorationLine: "underline" },
});
