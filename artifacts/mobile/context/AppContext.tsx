import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Category =
  | "food"
  | "transport"
  | "shopping"
  | "rent"
  | "bills"
  | "health"
  | "entertainment"
  | "education"
  | "travel"
  | "family"
  | "other";

export type PaymentMethod = "cash" | "card" | "bank" | "wallet";
export type Goal =
  | "understand"
  | "save"
  | "reduce-food"
  | "control-shopping"
  | "track-budget";

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string;
  note: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  isIncome?: boolean;
  customLabel?: string;
  customIcon?: string;
}

export interface UserProfile {
  name: string;
  monthlyIncome: number;
  monthlyBudget: number;
  savingsGoal: number;
  selectedGoal: Goal;
  onboardingComplete: boolean;
  countryCode?: string;
}

export interface CategoryBudget {
  category: Category;
  budgetAmount: number;
}

export interface SpendingSummary {
  totalCurrentMonth: number;
  totalPreviousMonth: number;
  totalCurrentMonthIncome: number;
  remainingBudget: number;
  percentChange: number;
  topCategory: Category | null;
  categoryTotals: Record<Category, number>;
  dailySpending: { date: string; amount: number }[];
  weekdayTotal: number;
  weekendTotal: number;
  smallPurchasesTotal: number;
  smallPurchasesPercent: number;
  averageDaily: number;
  unusualExpenses: Expense[];
  moneyPersonality: string;
}

interface AppContextType {
  expenses: Expense[];
  userProfile: UserProfile | null;
  categoryBudgets: CategoryBudget[];
  summary: SpendingSummary | null;
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;
  setUserProfile: (p: UserProfile) => void;
  setCategoryBudget: (category: Category, amount: number) => void;
  isLoading: boolean;
  currentMonthExpenses: Expense[];
  previousMonthExpenses: Expense[];
  currentMonthIncomeEntries: Expense[];
  restoreBackup: (data: { expenses: Expense[]; userProfile: UserProfile | null; categoryBudgets: CategoryBudget[] }) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "intensive_data_v1";

const SAMPLE_EXPENSES: Expense[] = [
  { id: "a01", amount: 850, category: "rent", date: "2026-04-01", note: "Monthly rent", paymentMethod: "bank", createdAt: "2026-04-01T08:00:00Z" },
  { id: "a02", amount: 89, category: "bills", date: "2026-04-02", note: "Electric bill", paymentMethod: "bank", createdAt: "2026-04-02T09:00:00Z" },
  { id: "a03", amount: 45.5, category: "food", date: "2026-04-02", note: "Grocery run", paymentMethod: "card", createdAt: "2026-04-02T11:00:00Z" },
  { id: "a04", amount: 25, category: "transport", date: "2026-04-03", note: "Uber", paymentMethod: "card", createdAt: "2026-04-03T09:30:00Z" },
  { id: "a05", amount: 12.3, category: "food", date: "2026-04-04", note: "Lunch", paymentMethod: "cash", createdAt: "2026-04-04T13:00:00Z" },
  { id: "a06", amount: 120, category: "shopping", date: "2026-04-05", note: "Amazon order", paymentMethod: "card", createdAt: "2026-04-05T14:00:00Z" },
  { id: "a07", amount: 35, category: "entertainment", date: "2026-04-06", note: "Movie night", paymentMethod: "card", createdAt: "2026-04-06T19:00:00Z" },
  { id: "a08", amount: 8.5, category: "food", date: "2026-04-07", note: "Coffee", paymentMethod: "cash", createdAt: "2026-04-07T08:15:00Z" },
  { id: "a09", amount: 18, category: "transport", date: "2026-04-08", note: "Metro pass", paymentMethod: "wallet", createdAt: "2026-04-08T07:45:00Z" },
  { id: "a10", amount: 65, category: "health", date: "2026-04-10", note: "Gym membership", paymentMethod: "card", createdAt: "2026-04-10T10:00:00Z" },
  { id: "a11", amount: 22, category: "food", date: "2026-04-11", note: "Dinner", paymentMethod: "card", createdAt: "2026-04-11T20:00:00Z" },
  { id: "a12", amount: 55, category: "shopping", date: "2026-04-12", note: "Clothes", paymentMethod: "card", createdAt: "2026-04-12T15:00:00Z" },
  { id: "a13", amount: 9.99, category: "entertainment", date: "2026-04-13", note: "Spotify", paymentMethod: "card", createdAt: "2026-04-13T00:00:00Z" },
  { id: "a14", amount: 38, category: "food", date: "2026-04-14", note: "Groceries", paymentMethod: "card", createdAt: "2026-04-14T11:00:00Z" },
  { id: "a15", amount: 15, category: "transport", date: "2026-04-15", note: "Parking", paymentMethod: "cash", createdAt: "2026-04-15T12:00:00Z" },
  { id: "a16", amount: 7.5, category: "food", date: "2026-04-16", note: "Snacks", paymentMethod: "cash", createdAt: "2026-04-16T15:30:00Z" },
  { id: "a17", amount: 45, category: "education", date: "2026-04-17", note: "Online course", paymentMethod: "card", createdAt: "2026-04-17T10:00:00Z" },
  { id: "a18", amount: 200, category: "shopping", date: "2026-04-18", note: "New headphones", paymentMethod: "card", createdAt: "2026-04-18T16:00:00Z" },
  { id: "a19", amount: 33, category: "food", date: "2026-04-19", note: "Saturday brunch", paymentMethod: "card", createdAt: "2026-04-19T10:30:00Z" },
  { id: "a20", amount: 28, category: "food", date: "2026-04-19", note: "Grocery", paymentMethod: "card", createdAt: "2026-04-19T14:00:00Z" },
  { id: "a21", amount: 85, category: "entertainment", date: "2026-04-20", note: "Concert tickets", paymentMethod: "card", createdAt: "2026-04-20T18:00:00Z" },
  { id: "a22", amount: 42, category: "food", date: "2026-04-20", note: "Sunday dinner", paymentMethod: "card", createdAt: "2026-04-20T19:30:00Z" },
  { id: "a23", amount: 12, category: "transport", date: "2026-04-22", note: "Taxi", paymentMethod: "wallet", createdAt: "2026-04-22T22:00:00Z" },
  { id: "a24", amount: 19, category: "food", date: "2026-04-24", note: "Lunch", paymentMethod: "cash", createdAt: "2026-04-24T13:00:00Z" },
  { id: "a25", amount: 150, category: "health", date: "2026-04-25", note: "Dentist", paymentMethod: "card", createdAt: "2026-04-25T14:00:00Z" },
  { id: "a26", amount: 6, category: "food", date: "2026-04-25", note: "Coffee", paymentMethod: "cash", createdAt: "2026-04-25T08:00:00Z" },
  { id: "a27", amount: 75, category: "shopping", date: "2026-04-26", note: "Shoes", paymentMethod: "card", createdAt: "2026-04-26T14:00:00Z" },
  { id: "a28", amount: 55, category: "food", date: "2026-04-27", note: "BBQ supplies", paymentMethod: "card", createdAt: "2026-04-27T11:00:00Z" },
  { id: "a29", amount: 30, category: "transport", date: "2026-04-28", note: "Gas", paymentMethod: "card", createdAt: "2026-04-28T17:00:00Z" },
  { id: "a30", amount: 14, category: "food", date: "2026-04-29", note: "Breakfast", paymentMethod: "cash", createdAt: "2026-04-29T09:00:00Z" },
  { id: "a31", amount: 8.5, category: "food", date: "2026-04-30", note: "Coffee", paymentMethod: "cash", createdAt: "2026-04-30T08:00:00Z" },
  { id: "m01", amount: 850, category: "rent", date: "2026-05-01", note: "Monthly rent", paymentMethod: "bank", createdAt: "2026-05-01T08:00:00Z" },
  { id: "m02", amount: 89, category: "bills", date: "2026-05-01", note: "Electric bill", paymentMethod: "bank", createdAt: "2026-05-01T09:00:00Z" },
  { id: "m03", amount: 15.5, category: "food", date: "2026-05-01", note: "Lunch", paymentMethod: "card", createdAt: "2026-05-01T13:00:00Z" },
  { id: "m04", amount: 4.8, category: "food", date: "2026-05-01", note: "Coffee", paymentMethod: "cash", createdAt: "2026-05-01T08:30:00Z" },
  { id: "m05", amount: 45, category: "food", date: "2026-05-02", note: "Groceries", paymentMethod: "card", createdAt: "2026-05-02T11:00:00Z" },
  { id: "m06", amount: 25, category: "transport", date: "2026-05-02", note: "Uber", paymentMethod: "card", createdAt: "2026-05-02T09:30:00Z" },
  { id: "m07", amount: 32, category: "shopping", date: "2026-05-02", note: "Book", paymentMethod: "card", createdAt: "2026-05-02T16:00:00Z" },
];

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  monthlyIncome: 4500,
  monthlyBudget: 2500,
  savingsGoal: 1000,
  selectedGoal: "understand",
  onboardingComplete: false,
  countryCode: "us",
};

const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: "food", budgetAmount: 400 },
  { category: "transport", budgetAmount: 150 },
  { category: "shopping", budgetAmount: 300 },
  { category: "rent", budgetAmount: 900 },
  { category: "bills", budgetAmount: 150 },
  { category: "health", budgetAmount: 200 },
  { category: "entertainment", budgetAmount: 150 },
  { category: "education", budgetAmount: 100 },
];

function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function computeSummary(expenses: Expense[], profile: UserProfile): SpendingSummary {
  const currKey = getCurrentMonthKey();
  const prevKey = getPreviousMonthKey();
  const curr = expenses.filter((e) => e.date.startsWith(currKey) && !e.isIncome);
  const prev = expenses.filter((e) => e.date.startsWith(prevKey) && !e.isIncome);
  const currIncome = expenses.filter((e) => e.date.startsWith(currKey) && e.isIncome);
  const totalCurrentMonth = curr.reduce((s, e) => s + e.amount, 0);
  const totalPreviousMonth = prev.reduce((s, e) => s + e.amount, 0);
  const totalCurrentMonthIncome = currIncome.reduce((s, e) => s + e.amount, 0);
  const remainingBudget = profile.monthlyBudget - totalCurrentMonth;
  const percentChange = totalPreviousMonth > 0 ? ((totalCurrentMonth - totalPreviousMonth) / totalPreviousMonth) * 100 : 0;
  const categoryTotals = {} as Record<Category, number>;
  const cats: Category[] = ["food", "transport", "shopping", "rent", "bills", "health", "entertainment", "education", "travel", "family", "other"];
  cats.forEach((c) => (categoryTotals[c] = 0));
  curr.forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount; });
  const topCategory = (Object.entries(categoryTotals) as [Category, number][]).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0)?.[0] ?? null;
  const dailyMap: Record<string, number> = {};
  curr.forEach((e) => { dailyMap[e.date] = (dailyMap[e.date] ?? 0) + e.amount; });
  const dailySpending = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => ({ date, amount }));
  let weekdayTotal = 0;
  let weekendTotal = 0;
  curr.forEach((e) => { const day = getDayOfWeek(e.date); if (day === 0 || day === 6) weekendTotal += e.amount; else weekdayTotal += e.amount; });
  const smallPurchasesTotal = curr.filter((e) => e.amount < 10).reduce((s, e) => s + e.amount, 0);
  const smallPurchasesPercent = totalCurrentMonth > 0 ? (smallPurchasesTotal / totalCurrentMonth) * 100 : 0;
  const daysInMonth = new Date().getDate();
  const averageDaily = daysInMonth > 0 ? totalCurrentMonth / daysInMonth : 0;
  const amounts = curr.map((e) => e.amount);
  const mean = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const stdDev = amounts.length > 0 ? Math.sqrt(amounts.map((x) => (x - mean) ** 2).reduce((a, b) => a + b, 0) / amounts.length) : 0;
  const unusualExpenses = curr.filter((e) => e.amount > mean + 2 * stdDev);
  let moneyPersonality = "Balanced Spender";
  if (weekendTotal > weekdayTotal * 1.5) moneyPersonality = "Weekend Spender";
  else if (topCategory === "food") moneyPersonality = "Food Lover";
  else if (topCategory === "shopping") moneyPersonality = "Impulse Shopper";
  else if (smallPurchasesPercent > 25) moneyPersonality = "Small Purchases Collector";
  else if (totalCurrentMonth < profile.monthlyBudget * 0.7) moneyPersonality = "Careful Planner";
  return { totalCurrentMonth, totalPreviousMonth, totalCurrentMonthIncome, remainingBudget, percentChange, topCategory, categoryTotals, dailySpending, weekdayTotal, weekendTotal, smallPurchasesTotal, smallPurchasesPercent, averageDaily, unusualExpenses, moneyPersonality };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(DEFAULT_BUDGETS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setExpenses(data.expenses ?? SAMPLE_EXPENSES);
          setUserProfileState(data.userProfile ?? null);
          setCategoryBudgets(data.categoryBudgets ?? DEFAULT_BUDGETS);
        } else {
          setExpenses(SAMPLE_EXPENSES);
          setUserProfileState(null);
        }
      } catch {
        setExpenses(SAMPLE_EXPENSES);
        setUserProfileState(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextExpenses: Expense[], nextProfile: UserProfile | null, nextBudgets: CategoryBudget[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses: nextExpenses, userProfile: nextProfile, categoryBudgets: nextBudgets }));
  }, []);

  const addExpense = useCallback((e: Omit<Expense, "id" | "createdAt">) => {
    const next = [{ ...e, id: String(Date.now()), createdAt: new Date().toISOString() }, ...expenses];
    setExpenses(next);
    void persist(next, userProfile, categoryBudgets);
  }, [expenses, userProfile, categoryBudgets, persist]);

  const deleteExpense = useCallback((id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    void persist(next, userProfile, categoryBudgets);
  }, [expenses, userProfile, categoryBudgets, persist]);

  const setUserProfile = useCallback((p: UserProfile) => {
    setUserProfileState(p);
    void persist(expenses, p, categoryBudgets);
  }, [expenses, categoryBudgets, persist]);

  const setCategoryBudget = useCallback((category: Category, amount: number) => {
    const next = categoryBudgets.some((b) => b.category === category)
      ? categoryBudgets.map((b) => (b.category === category ? { ...b, budgetAmount: amount } : b))
      : [...categoryBudgets, { category, budgetAmount: amount }];
    setCategoryBudgets(next);
    void persist(expenses, userProfile, next);
  }, [categoryBudgets, expenses, userProfile, persist]);

  const restoreBackup = useCallback((data: { expenses: Expense[]; userProfile: UserProfile | null; categoryBudgets: CategoryBudget[] }) => {
    setExpenses(data.expenses);
    setUserProfileState(data.userProfile);
    setCategoryBudgets(data.categoryBudgets);
    void persist(data.expenses, data.userProfile, data.categoryBudgets);
  }, [persist]);

  const clearAllData = useCallback(() => {
    setExpenses([]);
    setUserProfileState(null);
    setCategoryBudgets(DEFAULT_BUDGETS);
    void persist([], null, DEFAULT_BUDGETS);
  }, [persist]);

  const currentMonthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(getCurrentMonthKey()) && !e.isIncome), [expenses]);
  const previousMonthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(getPreviousMonthKey()) && !e.isIncome), [expenses]);
  const currentMonthIncomeEntries = useMemo(() => expenses.filter((e) => e.date.startsWith(getCurrentMonthKey()) && e.isIncome), [expenses]);
  const summary = useMemo(() => userProfile ? computeSummary(expenses, userProfile) : null, [expenses, userProfile]);

  return <AppContext.Provider value={{ expenses, userProfile, categoryBudgets, summary, addExpense, deleteExpense, setUserProfile, setCategoryBudget, isLoading, currentMonthExpenses, previousMonthExpenses, currentMonthIncomeEntries, restoreBackup, clearAllData }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
