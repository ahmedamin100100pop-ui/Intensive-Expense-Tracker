import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SECURITY_QUESTIONS } from "@/constants/securityQuestions";
import { useLanguage } from "@/context/LanguageContext";
import { useSecurity } from "@/context/SecurityContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SetupProps {
  mode: "setup";
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VerifyProps {
  mode: "verify";
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}

type Props = SetupProps | VerifyProps;

const MAX_VERIFY_ATTEMPTS = 3;

// ── Component ─────────────────────────────────────────────────────────────────

export function SecurityQuestionModal(props: Props) {
  const { t, language } = useLanguage();
  const { setupSecurityQuestion, verifySecurityAnswer, securityQuestionIndex, hasSecurityQuestion } = useSecurity();

  const questions = SECURITY_QUESTIONS[language] ?? SECURITY_QUESTIONS.en;
  const isRTL = language === "ar";

  // Setup state
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answer, setAnswer]           = useState("");
  const [saving, setSaving]           = useState(false);

  // Verify state
  const [verifyAnswer, setVerifyAnswer]   = useState("");
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const [verifyError, setVerifyError]     = useState("");

  const storedQuestionText =
    props.mode === "verify" && securityQuestionIndex !== null
      ? questions[securityQuestionIndex] ?? questions[0]
      : "";

  const resetState = () => {
    setSelectedIdx(null);
    setAnswer("");
    setSaving(false);
    setVerifyAnswer("");
    setVerifyAttempts(0);
    setVerifyError("");
  };

  const handleClose = () => { resetState(); props.onClose(); };

  // ── Setup mode ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (selectedIdx === null) {
      Alert.alert(t("selectQuestion"));
      return;
    }
    if (!answer.trim()) {
      Alert.alert(t("yourAnswer"));
      return;
    }
    setSaving(true);
    await setupSecurityQuestion(selectedIdx, answer.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetState();
    (props as SetupProps).onSuccess();
  };

  // ── Verify mode ────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!verifyAnswer.trim()) return;
    const ok = await verifySecurityAnswer(verifyAnswer.trim());
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      (props as VerifyProps).onVerified();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const newAttempts = verifyAttempts + 1;
      setVerifyAttempts(newAttempts);
      setVerifyAnswer("");
      if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
        setVerifyError(t("tooManyAttempts"));
      } else {
        setVerifyError(t("wrongAnswer"));
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={props.mode === "verify" ? "key-variant" : "shield-check-outline"}
              size={26}
              color="#fff"
            />
          </View>
          <Text style={styles.title}>
            {props.mode === "setup" ? t("securityQuestion") : t("forgotPIN")}
          </Text>
          <Text style={styles.subtitle}>
            {props.mode === "setup" ? t("securityQuestionSub") : t("answerToReset")}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {props.mode === "setup" ? (
            <>
              {/* Question list */}
              <Text style={styles.label}>{t("selectQuestion")}</Text>
              {questions.map((q, i) => {
                const active = selectedIdx === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.questionRow, active && styles.questionRowActive]}
                    onPress={() => { setSelectedIdx(i); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                      {active && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.questionText, active && styles.questionTextActive, isRTL && styles.rtlText]}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Answer input */}
              <Text style={[styles.label, { marginTop: 20 }]}>{t("yourAnswer")}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlText]}
                value={answer}
                onChangeText={setAnswer}
                placeholder={t("yourAnswer")}
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                textAlign={isRTL ? "right" : "left"}
              />

              {/* Save */}
              <TouchableOpacity
                style={[styles.actionBtn, (!answer.trim() || selectedIdx === null) && styles.actionBtnDisabled]}
                onPress={handleSave}
                disabled={!answer.trim() || selectedIdx === null || saving}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>{t("saveQuestion")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Show stored question */}
              <View style={styles.questionDisplay}>
                <MaterialCommunityIcons name="comment-question-outline" size={18} color="rgba(255,255,255,0.5)" />
                <Text style={[styles.questionDisplayText, isRTL && styles.rtlText]}>{storedQuestionText}</Text>
              </View>

              {/* Answer input */}
              <Text style={styles.label}>{t("yourAnswer")}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlText]}
                value={verifyAnswer}
                onChangeText={(v) => { setVerifyAnswer(v); setVerifyError(""); }}
                placeholder={t("yourAnswer")}
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                editable={verifyAttempts < MAX_VERIFY_ATTEMPTS}
                textAlign={isRTL ? "right" : "left"}
              />

              {/* Error */}
              {verifyError ? (
                <Text style={styles.errorText}>{verifyError}</Text>
              ) : null}

              {/* Verify */}
              <TouchableOpacity
                style={[styles.actionBtn, (!verifyAnswer.trim() || verifyAttempts >= MAX_VERIFY_ATTEMPTS) && styles.actionBtnDisabled]}
                onPress={handleVerify}
                disabled={!verifyAnswer.trim() || verifyAttempts >= MAX_VERIFY_ATTEMPTS}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>{t("verifyAnswer")}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A1035",
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  closeBtn: { position: "absolute", top: 20, right: 20, zIndex: 10 },

  header: { alignItems: "center", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  title:    { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8, textAlign: "center" },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  label: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },

  questionRow: {
    flexDirection: "row", alignItems: "flex-start",
    padding: 14, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 8, gap: 12,
  },
  questionRowActive: { backgroundColor: "rgba(99,102,241,0.2)", borderWidth: 1, borderColor: "#6366F1" },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center",
    marginTop: 2, flexShrink: 0,
  },
  radioOuterActive: { borderColor: "#6366F1" },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#6366F1" },
  questionText: { flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20 },
  questionTextActive: { color: "#fff" },
  rtlText: { textAlign: "right" },

  questionDisplay: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14,
    padding: 16, marginBottom: 20,
  },
  questionDisplayText: { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 22, fontWeight: "500" },

  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, padding: 16,
    color: "#fff", fontSize: 15,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
  },

  errorText: { color: "#FF6B6B", fontSize: 13, fontWeight: "600", marginBottom: 12, textAlign: "center" },

  actionBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 16, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
