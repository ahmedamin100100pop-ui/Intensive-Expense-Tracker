import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ── Notification handler (must be set at module level) ────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Preferences ───────────────────────────────────────────────────────────────

export interface NotifPrefs {
  budgetAlerts: boolean;
  dailyReminder: boolean;
  reminderHour: number;
  reminderMinute: number;
}

const PREFS_KEY             = "intensive_notif_prefs_v1";
const DAILY_ID_KEY          = "intensive_notif_daily_id_v1";
const BUDGET_NOTIFIED_KEY   = "intensive_notif_budget_fired_v1";

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  budgetAlerts:  true,
  dailyReminder: false,
  reminderHour:  20,
  reminderMinute: 0,
};

export async function getNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) } : DEFAULT_NOTIF_PREFS;
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

// ── Budget alerts (immediate) ─────────────────────────────────────────────────

/** Track which budget thresholds (80 / 100) fired this calendar month */
async function getBudgetFiredThisMonth(): Promise<Set<number>> {
  try {
    const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const raw = await AsyncStorage.getItem(`${BUDGET_NOTIFIED_KEY}_${monthKey}`);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

async function markBudgetFired(threshold: number): Promise<void> {
  try {
    const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    const existing = await getBudgetFiredThisMonth();
    existing.add(threshold);
    await AsyncStorage.setItem(
      `${BUDGET_NOTIFIED_KEY}_${monthKey}`,
      JSON.stringify([...existing]),
    );
  } catch { /* ignored */ }
}

export async function maybeSendBudgetAlert(
  percent: number,
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;

  const threshold = percent >= 100 ? 100 : percent >= 80 ? 80 : null;
  if (!threshold) return;

  const fired = await getBudgetFiredThisMonth();
  if (fired.has(threshold)) return; // already sent this month

  const granted = await checkNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // fire immediately
  });
  await markBudgetFired(threshold);
}

// ── Daily reminder ────────────────────────────────────────────────────────────

export async function scheduleDailyReminder(
  title: string,
  body: string,
  hour: number,
  minute: number,
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await cancelDailyReminder(); // cancel previous if any

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  await AsyncStorage.setItem(DAILY_ID_KEY, id);
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const id = await AsyncStorage.getItem(DAILY_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(DAILY_ID_KEY);
    }
  } catch { /* ignored */ }
}

// ── Preset reminder times ─────────────────────────────────────────────────────

export const REMINDER_TIMES: { label: string; hour: number; minute: number }[] = [
  { label: "8:00 AM",  hour: 8,  minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM",  hour: 18, minute: 0 },
  { label: "8:00 PM",  hour: 20, minute: 0 },
  { label: "10:00 PM", hour: 22, minute: 0 },
];
