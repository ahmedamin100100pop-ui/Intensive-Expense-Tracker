import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { getCountryByCode, getCategoryLabelForLang, type LanguageCode } from "../constants/translations";
import type { Category, Expense, UserProfile } from "../context/AppContext";

const CATEGORY_COLORS: Record<Category, string> = {
  food: "#F97316", transport: "#3B82F6", shopping: "#EC4899",
  rent: "#6366F1", bills: "#EAB308", health: "#EF4444",
  entertainment: "#8B5CF6", education: "#14B8A6", travel: "#06B6D4",
  family: "#10B981", other: "#6B7280",
};

const PAYMENT_LABELS: Record<LanguageCode, Record<string, string>> = {
  en: {
    cash: "Cash",
    card: "Card",
    bank: "Bank Transfer",
    wallet: "Wallet",
  },
  ar: {
    cash: "نقدًا",
    card: "بطاقة",
    bank: "تحويل بنكي",
    wallet: "محفظة",
  },
};

function formatCurrency(amount: number, symbol: string, locale: string): string {
  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export interface PDFOptions {
  expenses: Expense[];
  userProfile: UserProfile | null;
  language: LanguageCode;
  periodLabel: string;
  periodType: "day" | "month" | "year";
  monthlyData?: { label: string; amount: number }[];
}

export function renderPDFHTML(opts: PDFOptions): string {
  const { expenses, userProfile, language, periodLabel, periodType, monthlyData } = opts;
  const userName = userProfile?.name?.trim() || "Rasheed User";
  const locale = language === "ar" ? "ar-SA" : "en-US";
  const currency = getCountryByCode(userProfile?.countryCode).symbol;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Category totals
  const catTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount;
  });
  const sortedCats = (Object.entries(catTotals) as [Category, number][])
    .sort((a, b) => b[1] - a[1]);

  const avgDaily = (() => {
    if (expenses.length === 0) return 0;
    const dates = new Set(expenses.map((e) => e.date));
    return total / dates.size;
  })();

  const topCat = sortedCats[0]?.[0];
  const topCatAmount = topCat ? catTotals[topCat] ?? 0 : 0;
  const topCatPct = total > 0 ? (topCatAmount / total) * 100 : 0;
  const averageTransaction = expenses.length > 0 ? total / expenses.length : 0;
  const largestExpense = expenses.reduce<Expense | null>(
    (largest, expense) => (!largest || expense.amount > largest.amount ? expense : largest),
    null,
  );
  const dailyTotals = expenses.reduce<Record<string, number>>((days, expense) => {
    days[expense.date] = (days[expense.date] ?? 0) + expense.amount;
    return days;
  }, {});
  const busiestDay = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];
  const budget = userProfile?.monthlyBudget ?? 0;
  const budgetRatio = periodType === "month" && budget > 0 ? total / budget : null;
  const generatedAt = new Date().toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });

  // Build category rows HTML
  const categoryRowsHTML = sortedCats.map(([cat, amount]) => {
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const color = CATEGORY_COLORS[cat];
    return `
      <div class="cat-row">
        <div class="cat-header">
          <div class="cat-name">
            <span class="cat-dot" style="background:${color}"></span>
            ${getCategoryLabelForLang(cat, language)}
          </div>
          <div class="cat-right">
            <span class="cat-amount">${formatCurrency(amount, currency, locale)}</span>
            <span class="cat-pct">${pct.toFixed(1)}%</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join("");

  // Build expense table rows
  const expenseRowsHTML = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e, i) => {
      const color = CATEGORY_COLORS[e.category];
      const rowClass = i % 2 === 1 ? 'class="row-alt"' : "";
      return `
        <tr ${rowClass}>
          <td>${formatDate(e.date, locale)}</td>
          <td>
            <span class="badge" style="background:${color}22;color:${color}">
              ${getCategoryLabelForLang(e.category, language)}
            </span>
          </td>
          <td>${e.note || "—"}</td>
          <td>${PAYMENT_LABELS[language][e.paymentMethod] ?? e.paymentMethod}</td>
          <td class="td-amount">${formatCurrency(e.amount, currency, locale)}</td>
        </tr>`;
    }).join("");

  const analysisLead = topCat
    ? language === "ar"
      ? `تركّز ${topCatPct.toFixed(1)}% من إنفاقك في فئة ${getCategoryLabelForLang(topCat, language)}.`
      : `${topCatPct.toFixed(1)}% of your spending went to ${getCategoryLabelForLang(topCat, language)}.`
    : language === "ar"
      ? "أضف عمليات أكثر للحصول على تحليل أدق."
      : "Add more transactions to get a more detailed analysis.";

  const analysisItems = [
    topCat
      ? {
          label: language === "ar" ? "أعلى فئة" : "Top category",
          value: getCategoryLabelForLang(topCat, language),
          detail: `${topCatPct.toFixed(1)}% · ${formatCurrency(topCatAmount, currency, locale)}`,
        }
      : null,
    largestExpense
      ? {
          label: language === "ar" ? "أكبر عملية" : "Largest transaction",
          value: formatCurrency(largestExpense.amount, currency, locale),
          detail: formatDate(largestExpense.date, locale),
        }
      : null,
    busiestDay
      ? {
          label: language === "ar" ? "أكثر يوم إنفاقًا" : "Busiest spending day",
          value: formatCurrency(busiestDay[1], currency, locale),
          detail: formatDate(busiestDay[0], locale),
        }
      : null,
    {
      label: language === "ar" ? "متوسط العملية" : "Average transaction",
      value: formatCurrency(averageTransaction, currency, locale),
      detail: `${expenses.length} ${language === "ar" ? "عملية" : expenses.length === 1 ? "transaction" : "transactions"}`,
    },
    budgetRatio !== null
      ? {
          label: language === "ar" ? "استخدام الميزانية" : "Budget used",
          value: `${(budgetRatio * 100).toFixed(1)}%`,
          detail: `${formatCurrency(total, currency, locale)} / ${formatCurrency(budget, currency, locale)}`,
        }
      : null,
  ].filter((item): item is { label: string; value: string; detail: string } => item !== null);

  const analysisHTML = `
    <div class="section analysis-section">
      <div class="section-title">${language === "ar" ? "التحليل" : "Analysis"}</div>
      <div class="analysis-box">
        <div class="analysis-lead">${analysisLead}</div>
        <div class="analysis-grid">
          ${analysisItems.map((item) => `
            <div class="analysis-item">
              <div class="analysis-label">${item.label}</div>
              <div class="analysis-value">${item.value}</div>
              <div class="analysis-detail">${item.detail}</div>
            </div>`).join("")}
        </div>
        ${budgetRatio !== null ? `
          <div class="budget-analysis ${budgetRatio > 1 ? "over" : ""}">
            <div class="budget-analysis-header">
              <span>${language === "ar" ? (budgetRatio > 1 ? "تجاوزت ميزانيتك الشهرية" : "التقدم نحو الميزانية الشهرية") : (budgetRatio > 1 ? "Monthly budget exceeded" : "Progress toward monthly budget")}</span>
              <strong>${Math.min(budgetRatio * 100, 100).toFixed(1)}%</strong>
            </div>
            <div class="budget-analysis-track">
              <div class="budget-analysis-fill" style="width:${Math.min(budgetRatio * 100, 100)}%"></div>
            </div>
          </div>` : ""}
      </div>
    </div>`;

  // Time-series bar chart HTML (for month/year views)
  let barChartHTML = "";
  if (monthlyData && monthlyData.length > 0) {
    const maxVal = Math.max(...monthlyData.map((d) => d.amount), 1);
    const bars = monthlyData.map((d) => {
      const heightPct = Math.max((d.amount / maxVal) * 100, 3);
      return `
        <div class="bar-col">
          <div class="bar-val">${d.amount >= 1000 ? `${currency}${(d.amount / 1000).toFixed(1)}k` : `${currency}${d.amount.toFixed(0)}`}</div>
          <div class="bar-plot"><div class="bar-fill" style="height:${heightPct}%;background:#4F46E5;opacity:${d.amount === maxVal ? 1 : 0.55}"></div></div>
          <div class="bar-label">${d.label}</div>
        </div>`;
    }).join("");
    barChartHTML = `
      <div class="section time-series-section">
        <div class="section-title">${language === "ar" ? "الإنفاق عبر الوقت" : "Spending over time"}</div>
        <div class="bar-chart">${bars}</div>
      </div>`;
  }

  // Stats
  const statsHTML = `
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${formatCurrency(total, currency, locale)}</div>
        <div class="stat-label">${language === "ar" ? "إجمالي الإنفاق" : "Total Spent"}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${expenses.length}</div>
        <div class="stat-label">${language === "ar" ? "العمليات" : "Transactions"}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${formatCurrency(avgDaily, currency, locale)}</div>
        <div class="stat-label">${language === "ar" ? "المتوسط اليومي" : "Avg per Day"}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${topCat ? getCategoryLabelForLang(topCat, language) : "—"}</div>
        <div class="stat-label">${language === "ar" ? "أعلى فئة" : "Top Category"}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${sortedCats.length}</div>
        <div class="stat-label">${language === "ar" ? "الفئات" : "Categories"}</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${topCat ? formatCurrency(catTotals[topCat] ?? 0, currency, locale) : "—"}</div>
        <div class="stat-label">${language === "ar" ? "أعلى إنفاق" : "Top Spent"}</div>
      </div>
    </div>`;

  const dir = language === "ar" ? "rtl" : "ltr";
  const tableHeaders = language === "ar"
    ? { date: "التاريخ", category: "الفئة", note: "الملاحظة", method: "طريقة الدفع", amount: "المبلغ" }
    : { date: "Date", category: "Category", note: "Note", method: "Method", amount: "Amount" };

  const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#F0F0F8;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{background:#fff;max-width:720px;margin:0 auto;min-height:100vh}

  /* HEADER */
  .header{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:48px 40px 40px;position:relative;overflow:hidden}
  .header::after{content:'';position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,0.07)}
  .header::before{content:'';position:absolute;right:40px;bottom:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.05)}
  .header-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.9);margin-bottom:20px}
  .header-dot{width:6px;height:6px;border-radius:50%;background:#A5F3FC}
  .header-name{color:#fff;font-size:30px;font-weight:800;letter-spacing:-0.5px;margin-bottom:2px}
  .header-period{color:rgba(255,255,255,0.7);font-size:14px;margin-bottom:28px}
  .header-amount{color:#fff;font-size:56px;font-weight:900;letter-spacing:-2px;line-height:1;margin-bottom:6px}
  .header-sublabel{color:rgba(255,255,255,0.65);font-size:13px}

  /* CONTENT */
  .content{padding:36px 40px}

  /* SECTION */
  .section{margin-bottom:32px}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #F3F4F6}

  /* STATS */
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:0}
  .stat-box{background:#F6F6FB;border-radius:12px;padding:18px 16px;text-align:center}
  .stat-value{font-size:18px;font-weight:800;color:#4F46E5;margin-bottom:4px;line-height:1.2}
  .stat-label{font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px}

  /* CATEGORIES */
  .cat-row{margin-bottom:14px}
  .cat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .cat-name{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#111827}
  .cat-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .cat-right{display:flex;align-items:center;gap:8px}
  .cat-amount{font-size:13px;font-weight:700;color:#111827}
  .cat-pct{font-size:11px;color:#9CA3AF;font-weight:500}
  .progress-track{height:7px;background:#F3F4F6;border-radius:4px;overflow:hidden}
  .progress-fill{height:100%;border-radius:4px}

  /* BAR CHART */
  .analysis-box{background:#F6F6FB;border:1px solid #EBEBF8;border-radius:12px;padding:16px}
  .analysis-lead{font-size:13px;font-weight:700;color:#111827;line-height:1.5;margin-bottom:14px}
  .analysis-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .analysis-item{background:#fff;border-radius:9px;padding:11px 12px;min-height:68px}
  .analysis-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:5px}
  .analysis-value{font-size:14px;font-weight:800;color:#4F46E5;line-height:1.2}
  .analysis-detail{font-size:10px;color:#6B7280;margin-top:3px}
  .budget-analysis{margin-top:12px;background:#fff;border-radius:9px;padding:11px 12px}
  .budget-analysis.over{background:#FFF7ED}
  .budget-analysis-header{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#6B7280;margin-bottom:7px}
  .budget-analysis-header strong{color:#4F46E5}
  .budget-analysis.over .budget-analysis-header strong{color:#EA580C}
  .budget-analysis-track{height:7px;background:#E5E7EB;border-radius:4px;overflow:hidden}
  .budget-analysis-fill{height:100%;background:#4F46E5;border-radius:4px}
  .budget-analysis.over .budget-analysis-fill{background:#EA580C}
  .bar-chart{display:flex;align-items:stretch;gap:7px;height:154px;padding:0 2px 4px}
  .bar-col{flex:1;display:grid;grid-template-rows:16px 1fr 18px;align-items:end;min-width:0}
  .bar-val{font-size:8px;color:#6B7280;font-weight:600;text-align:center;white-space:nowrap}
  .bar-plot{height:100%;display:flex;align-items:flex-end;justify-content:center;border-bottom:1px solid #E5E7EB}
  .bar-fill{width:72%;min-height:4px;border-radius:4px 4px 0 0}
  .bar-label{font-size:8px;color:#9CA3AF;text-align:center;font-weight:500;white-space:nowrap;padding-top:4px}

  /* TABLE */
  .table-wrap{overflow:visible;border-radius:12px;border:1px solid #F3F4F6}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead{display:table-header-group}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9CA3AF;padding:12px 14px;text-align:left;background:#FAFAFA;border-bottom:1px solid #F3F4F6}
  td{padding:11px 14px;border-bottom:1px solid #F9FAFB;color:#374151;vertical-align:middle}
  .row-alt td{background:#FAFAFA}
  tr:last-child td{border-bottom:none}
  .td-amount{font-weight:700;text-align:right;color:#111827;font-size:13px}
  .badge{display:inline-block;padding:3px 9px;border-radius:10px;font-size:10px;font-weight:700}

  /* FOOTER */
  .footer{background:#F6F6FB;padding:24px 40px;text-align:center;border-top:1px solid #EBEBF8}
  .footer-text{font-size:11px;color:#9CA3AF}
  .footer-brand{font-weight:700;color:#4F46E5}

  /* PRINT PAGINATION */
  @media print{
    .summary-section,.analysis-section,.time-series-section,.categories-section{
      break-inside:avoid;page-break-inside:avoid
    }
    .analysis-item,.cat-row,tr{break-inside:avoid;page-break-inside:avoid}
    .transactions-section{break-inside:auto;page-break-inside:auto}
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-eyebrow">
      <span class="header-dot"></span>
      ${language === "ar" ? "رشيد · التقرير الشهري" : "Rasheed · Spending Report"}
    </div>
    <div class="header-name">${userName}</div>
    <div class="header-period">${periodLabel}</div>
    <div class="header-amount">${formatCurrency(total, currency, locale)}</div>
    <div class="header-sublabel">${language === "ar" ? "إجمالي الإنفاق في هذه الفترة" : "Total spent in this period"}</div>
  </div>

  <div class="content">

    <div class="section summary-section">
      <div class="section-title">${language === "ar" ? "الملخص" : "Summary"}</div>
      ${statsHTML}
    </div>

    ${analysisHTML}

    ${barChartHTML}

    ${sortedCats.length > 0 ? `
    <div class="section categories-section">
      <div class="section-title">${language === "ar" ? "الإنفاق حسب الفئة" : "Spending by category"}</div>
      ${categoryRowsHTML}
    </div>` : ""}

    ${expenses.length > 0 ? `
    <div class="section transactions-section">
      <div class="section-title">${language === "ar" ? `كل العمليات (${expenses.length})` : `All transactions (${expenses.length})`}</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${tableHeaders.date}</th>
              <th>${tableHeaders.category}</th>
              <th>${tableHeaders.note}</th>
              <th>${tableHeaders.method}</th>
              <th style="text-align:${language === "ar" ? "left" : "right"}">${tableHeaders.amount}</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHTML}
          </tbody>
        </table>
      </div>
    </div>` : ""}

  </div>

  <div class="footer">
    <div class="footer-text">Generated by <span class="footer-brand">Rasheed</span> · ${generatedAt}</div>
  </div>

</div>
</body>
</html>`;

  return html;
}

export async function generateAndSharePDF(opts: PDFOptions): Promise<void> {
  const html = renderPDFHTML(opts);

  if (Platform.OS === "web") {
    // Open HTML in a new tab — user can File → Print → Save as PDF
    const win = window.open("", "_blank");
    if (!win) throw new Error("Popup blocked. Please allow popups and try again.");
    win.document.write(html);
    win.document.close();
    // Small delay so the page fully renders before the print dialog opens
    setTimeout(() => { win.focus(); win.print(); }, 600);
  } else {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Rasheed Report – ${opts.periodLabel}`,
        UTI: "com.adobe.pdf",
      });
    }
  }
}
