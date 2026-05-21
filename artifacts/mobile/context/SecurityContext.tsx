import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

// ── Secure storage helpers (SecureStore not available on web) ─────────────────

const PIN_KEY      = "intensive_pin_v1";
const BIOMETRIC_KEY = "intensive_biometric_v1";

function secureGet(key: string) {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}
function secureSet(key: string, value: string) {
  return Platform.OS === "web"
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value);
}
function secureDelete(key: string) {
  return Platform.OS === "web"
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key);
}

// ── Context type ──────────────────────────────────────────────────────────────

export interface SecurityContextType {
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  isLocked: boolean;
  isReady: boolean;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  disablePin: () => Promise<void>;
  toggleBiometric: (enabled: boolean) => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isPinEnabled, setIsPinEnabled]             = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isLocked, setIsLocked]                     = useState(false);
  const [isReady, setIsReady]                       = useState(false);

  const appStateRef  = useRef<AppStateStatus>(AppState.currentState);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [pin, biometric, bioAvail, bioEnrolled] = await Promise.all([
          secureGet(PIN_KEY),
          secureGet(BIOMETRIC_KEY),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);

        if (!mounted) return;

        const pinEnabled = pin !== null;
        const bioEnabled = biometric === "true";
        const bioAvailable = bioAvail && bioEnrolled;

        setIsPinEnabled(pinEnabled);
        setIsBiometricEnabled(bioEnabled);
        setIsBiometricAvailable(bioAvailable);

        if (pinEnabled) {
          setIsLocked(true);
          // Auto-prompt biometric after splash clears
          if (bioEnabled && bioAvailable) {
            setTimeout(() => doTryBiometric(), 600);
          }
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // ── AppState: lock when backgrounded ─────────────────────────────────────

  const isPinEnabledRef       = useRef(isPinEnabled);
  const isBiometricEnabledRef = useRef(isBiometricEnabled);
  const isBiometricAvailRef   = useRef(isBiometricAvailable);
  const isLockedRef           = useRef(isLocked);

  useEffect(() => { isPinEnabledRef.current       = isPinEnabled;       }, [isPinEnabled]);
  useEffect(() => { isBiometricEnabledRef.current = isBiometricEnabled; }, [isBiometricEnabled]);
  useEffect(() => { isBiometricAvailRef.current   = isBiometricAvailable; }, [isBiometricAvailable]);
  useEffect(() => { isLockedRef.current           = isLocked;           }, [isLocked]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev === "active" && next === "background") {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        lockTimerRef.current = setTimeout(() => {
          if (isPinEnabledRef.current) setIsLocked(true);
        }, 500);
      }

      if (next === "active" && isLockedRef.current &&
          isBiometricEnabledRef.current && isBiometricAvailRef.current) {
        doTryBiometric();
      }
    });

    return () => {
      sub.remove();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // ── Biometric helper ─────────────────────────────────────────────────────

  async function doTryBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:          "Authenticate to open Intensive",
        cancelLabel:            "Use PIN",
        disableDeviceFallback:  true,
      });
      if (result.success) setIsLocked(false);
    } catch {
      // ignored — user falls back to PIN
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  const setupPin = useCallback(async (pin: string) => {
    await secureSet(PIN_KEY, pin);
    setIsPinEnabled(true);
    setIsLocked(false);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const stored = await secureGet(PIN_KEY);
    return stored === pin;
  }, []);

  const disablePin = useCallback(async () => {
    await secureDelete(PIN_KEY);
    await secureDelete(BIOMETRIC_KEY);
    setIsPinEnabled(false);
    setIsBiometricEnabled(false);
    setIsLocked(false);
  }, []);

  const toggleBiometric = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await secureSet(BIOMETRIC_KEY, "true");
    } else {
      await secureDelete(BIOMETRIC_KEY);
    }
    setIsBiometricEnabled(enabled);
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:         "Authenticate to open Intensive",
        cancelLabel:           "Use PIN",
        disableDeviceFallback: true,
      });
      if (result.success) { setIsLocked(false); return true; }
      return false;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock   = useCallback(() => { if (isPinEnabledRef.current) setIsLocked(true); }, []);

  return (
    <SecurityContext.Provider value={{
      isPinEnabled, isBiometricEnabled, isBiometricAvailable,
      isLocked, isReady,
      setupPin, verifyPin, disablePin, toggleBiometric,
      authenticateWithBiometric, unlock, lock,
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity(): SecurityContextType {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity must be used within SecurityProvider");
  return ctx;
}
