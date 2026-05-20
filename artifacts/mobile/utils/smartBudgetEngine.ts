import type { Category, CategoryBudget, Expense, UserProfile } from "@/context/AppContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";

export interface BudgetSuggestion {
  category: Category;
  arabicCategoryName: string;
  currentBudget: number;
  avgMonthlySpent: number;
  recommendedBudget: number;
  changeAmount: number;       // negative = saving, positive = increase needed
  changePct: number;
  riskLevel: RiskLevel;
  arabicReason: string;
  monthsAnalyzed: number;
  isFixed: boolean;
  isSaving: boolean;          // true = we suggest cutting, false = increase needed
}

export interface SmartBudgetResult {
  suggestions: BudgetSuggestion[];
  totalCurrentBudget: number;
  totalRecommendedBudget: number;
  totalMonthlySaving: number;
  wasIncomeCapped: boolean;
  monthsAnalyzed: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FIXED_CATEGORIES = new Set<Category>(["rent", "bills", "education"]);

const ARABIC_NAMES: Record<Category, string> = {
  food:          "الطعام",
  transport:     "المواصلات",
  shopping:      "التسوق",
  rent:          "الإيجار",
  bills:         "الفواتير",
  health:        "الصحة",
  entertainment: "الترفيه",
  education:     "التعليم",
  travel:        "السفر",
  family:        "العائلة",
  other:         "أخرى",
};

// Safety buffer percentages by usage ratio bracket
function getBuffer(usageRatio: number, isFixed: boolean): number {
  if (isFixed) return 0.08;
  if (usageRatio > 1.1) return 0.12;
  if (usageRatio > 0.85) return 0.10;
  if (usageRatio > 0.65) return 0.12;
  return 0.10;
}

// Round to nearest 5 for cleaner numbers
function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

// ── Month helpers ─────────────────────────────────────────────────────────────

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getPastMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d.getFullYear(), d.getMonth()));
  }
  return keys;
}

// ── Risk and reason helpers ───────────────────────────────────────────────────

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const stddev = Math.sqrt(values.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length);
  return stddev / mean;
}

function computeRisk(monthsAnalyzed: number, cv: number): RiskLevel {
  if (monthsAnalyzed >= 4 && cv < 0.25) return "low";
  if (monthsAnalyzed >= 2 && cv < 0.5) return "medium";
  return "high";
}

function arabicReason(
  isFixed: boolean,
  usageRatio: number,
  avgMonthlySpent: number,
  monthsAnalyzed: number,
): string {
  if (isFixed) {
    if (usageRatio > 1.05) return "تجاوزت ميزانيتك الثابتة — نوصي برفعها لتغطية احتياجاتك الفعلية";
    if (usageRatio > 0.9)  return "نفقاتك الثابتة مستقرة — اقترحنا هامش أمان بسيط";
    return "هذه نفقات ثابتة ومنتظمة — الميزانية محسوبة بدقة";
  }
  if (avgMonthlySpent === 0) return "لا يوجد إنفاق مسجل في هذه الفئة — يمكن تخفيض الميزانية بأمان";
  if (usageRatio < 0.5)     return "إنفاقك أقل من نصف الميزانية — يمكن تخفيضها بشكل كبير مع هامش احتياطي";
  if (usageRatio < 0.7)     return "إنفاقك أقل من الميزانية المحددة — اقتراح تخفيض بأمان مع هامش 10٪";
  if (usageRatio < 0.85)    return "إنفاقك منتظم وأقل من الميزانية — تعديل طفيف مع هامش أمان كافٍ";
  if (usageRatio < 1.0)     return "إنفاقك قريب من الحد الأقصى — أضفنا هامش أمان لتفادي التجاوز";
  if (usageRatio < 1.2)     return "تجاوزت الميزانية أحياناً — ننصح برفعها لتتوافق مع إنفاقك الفعلي";
  return "إنفاقك يتجاوز الميزانية باستمرار — الرفع ضروري لإدارة مصروفاتك بواقعية";
}

// ── Core engine ───────────────────────────────────────────────────────────────

export function computeSmartBudgetSuggestions(
  expenses: Expense[],
  categoryBudgets: CategoryBudget[],
  userProfile: UserProfile | null,
): SmartBudgetResult {
  const MONTHS_TO_ANALYZE = 6;
  const pastMonthKeys = getPastMonthKeys(MONTHS_TO_ANALYZE);

  // Index: month-key → category → total
  const monthCatTotals = new Map<string, Map<Category, number>>();
  for (const mk of pastMonthKeys) {
    monthCatTotals.set(mk, new Map<Category, number>());
  }

  // Fill totals from expense history (exclude income entries)
  for (const exp of expenses) {
    if (exp.isIncome) continue;
    const d = new Date(exp.date + "T00:00:00");
    const mk = monthKey(d.getFullYear(), d.getMonth());
    if (!monthCatTotals.has(mk)) continue;
    const catMap = monthCatTotals.get(mk)!;
    catMap.set(exp.category, (catMap.get(exp.category) ?? 0) + exp.amount);
  }

  // Determine which past months had ANY spending (to avoid penalizing sparse early months)
  const activeMonthKeys = pastMonthKeys.filter((mk) => {
    const catMap = monthCatTotals.get(mk)!;
    return catMap.size > 0;
  });
  const analyzedMonthCount = Math.max(activeMonthKeys.length, 1);

  // ── Per-category analysis ─────────────────────────────────────────────────

  const rawSuggestions: BudgetSuggestion[] = [];

  for (const cb of categoryBudgets) {
    const { category, budgetAmount: currentBudget } = cb;
    if (currentBudget <= 0) continue;

    const isFixed = FIXED_CATEGORIES.has(category);

    // Collect per-month totals for this category (0 if no spending that month)
    const perMonthAmounts = activeMonthKeys.map((mk) => monthCatTotals.get(mk)?.get(category) ?? 0);

    // Need at least 1 active month
    if (perMonthAmounts.length === 0) continue;

    const avgMonthlySpent = perMonthAmounts.reduce((a, b) => a + b, 0) / perMonthAmounts.length;
    const usageRatio = avgMonthlySpent / currentBudget;
    const cv = coefficientOfVariation(perMonthAmounts);
    const monthsAnalyzed = perMonthAmounts.length;

    // ── Compute recommendation ──────────────────────────────────────────────

    let recommended: number;

    if (isFixed) {
      // Never reduce fixed; only align up if consistently over
      const buffer = getBuffer(usageRatio, true);
      recommended = Math.max(currentBudget, roundTo5(avgMonthlySpent * (1 + buffer)));
    } else if (avgMonthlySpent === 0) {
      // Never spent here — suggest minimum
      recommended = roundTo5(currentBudget * 0.25);
      recommended = Math.max(recommended, 20);
    } else {
      const buffer = getBuffer(usageRatio, false);
      recommended = roundTo5(avgMonthlySpent * (1 + buffer));
      // Never reduce below 20% of current (hard floor)
      const floor = Math.max(roundTo5(currentBudget * 0.2), 20);
      recommended = Math.max(recommended, floor);
    }

    const changeAmount = recommended - currentBudget;
    const changePct = (changeAmount / currentBudget) * 100;

    // Skip if change is negligible (< 4% and < 10 units)
    if (Math.abs(changePct) < 4 && Math.abs(changeAmount) < 10) continue;

    const riskLevel = computeRisk(monthsAnalyzed, cv);
    const reason = arabicReason(isFixed, usageRatio, avgMonthlySpent, monthsAnalyzed);

    rawSuggestions.push({
      category,
      arabicCategoryName: ARABIC_NAMES[category] ?? category,
      currentBudget,
      avgMonthlySpent,
      recommendedBudget: recommended,
      changeAmount,
      changePct,
      riskLevel,
      arabicReason: reason,
      monthsAnalyzed,
      isFixed,
      isSaving: changeAmount < 0,
    });
  }

  // ── Income cap optimization ───────────────────────────────────────────────

  let wasIncomeCapped = false;
  const monthlyIncome = userProfile?.monthlyIncome ?? 0;

  if (monthlyIncome > 0) {
    const totalRecommended = rawSuggestions.reduce((s, sg) => s + sg.recommendedBudget, 0);
    const incomeLimit = monthlyIncome * 0.90;

    if (totalRecommended > incomeLimit) {
      wasIncomeCapped = true;
      const flexibleSuggestions = rawSuggestions.filter((sg) => !sg.isFixed);
      const fixedTotal = rawSuggestions.filter((sg) => sg.isFixed).reduce((s, sg) => s + sg.recommendedBudget, 0);
      const flexibleBudget = incomeLimit - fixedTotal;
      const currentFlexTotal = flexibleSuggestions.reduce((s, sg) => s + sg.recommendedBudget, 0);

      if (flexibleBudget > 0 && currentFlexTotal > 0) {
        const scale = flexibleBudget / currentFlexTotal;
        for (const sg of flexibleSuggestions) {
          const capped = roundTo5(sg.recommendedBudget * scale);
          // Never go below average spending + 5%
          const minAllowed = roundTo5(sg.avgMonthlySpent * 1.05);
          sg.recommendedBudget = Math.max(capped, minAllowed, 20);
          sg.changeAmount = sg.recommendedBudget - sg.currentBudget;
          sg.changePct = (sg.changeAmount / sg.currentBudget) * 100;
          sg.isSaving = sg.changeAmount < 0;
          // Re-check negligibility after capping
        }
      }
    }
  }

  // Re-filter negligible after income cap adjustments
  const suggestions = rawSuggestions.filter(
    (sg) => !(Math.abs(sg.changePct) < 4 && Math.abs(sg.changeAmount) < 10),
  );

  // Sort: savings first (largest saving first), then increases (smallest increase first)
  suggestions.sort((a, b) => {
    if (a.isSaving && !b.isSaving) return -1;
    if (!a.isSaving && b.isSaving) return 1;
    if (a.isSaving) return a.changeAmount - b.changeAmount; // more negative = bigger saving = first
    return a.changeAmount - b.changeAmount; // smaller increase first
  });

  const totalCurrentBudget = suggestions.reduce((s, sg) => s + sg.currentBudget, 0);
  const totalRecommendedBudget = suggestions.reduce((s, sg) => s + sg.recommendedBudget, 0);
  const totalMonthlySaving = suggestions.filter((sg) => sg.isSaving).reduce((s, sg) => s + Math.abs(sg.changeAmount), 0);

  return {
    suggestions,
    totalCurrentBudget,
    totalRecommendedBudget,
    totalMonthlySaving,
    wasIncomeCapped,
    monthsAnalyzed: analyzedMonthCount,
  };
}
