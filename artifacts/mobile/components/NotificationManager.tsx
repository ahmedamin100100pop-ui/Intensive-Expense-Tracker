import { useEffect } from "react";

import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { getNotifPrefs, maybeSendBudgetAlert } from "@/utils/notifications";

/**
 * Headless component that watches spending and fires budget-alert notifications.
 * Must be rendered inside both AppProvider and LanguageProvider.
 */
export function NotificationManager() {
  const { summary, userProfile } = useApp();
  const { t }                    = useLanguage();

  useEffect(() => {
    if (!summary || !userProfile || userProfile.monthlyBudget <= 0) return;

    const percent   = (summary.totalCurrentMonth / userProfile.monthlyBudget) * 100;
    const remaining = userProfile.monthlyBudget - summary.totalCurrentMonth;

    void (async () => {
      const prefs = await getNotifPrefs();
      if (!prefs.budgetAlerts) return;

      if (percent >= 100) {
        await maybeSendBudgetAlert(
          percent,
          t("budgetAlert100Title"),
          t("budgetAlert100Body", { amount: Math.abs(remaining).toFixed(0) }),
        );
      } else if (percent >= 80) {
        await maybeSendBudgetAlert(
          percent,
          t("budgetAlert80Title"),
          t("budgetAlert80Body", { amount: remaining.toFixed(0) }),
        );
      }
    })();
  }, [summary?.totalCurrentMonth, userProfile?.monthlyBudget]);

  return null;
}
